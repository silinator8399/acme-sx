import path from "path";
import { ACMEClientOptions, ACMEEvents, ACMEResponse, IssueCertificateOptions } from "../main";
import acme from 'acme-client';
import fs from "fs";
import { CreateCSRResult } from "./types";
import { HTTP01Challenge } from "./challenge/http-01.challenge";
import { IACMEChallenge } from "./challenge/acme-challenge.interface";
import { ACMEStoreResult } from "../client/types";


export class ACMESM{
    public async createClient(options: IssueCertificateOptions, staging: boolean): Promise<acme.Client>{
        const directoryUrl: string = staging ? acme.directory.letsencrypt.staging : acme.directory.letsencrypt.production
        
        if(fs.existsSync(path.join(options.certificateStorePath, "account-key.pem"))){
            ACMEEvents.log(`Existing account key found at "${path.join(options.certificateStorePath, "account-key.pem")}". Using existing key to create ACME client.`);
            let accountKey: acme.PrivateKeyBuffer = fs.readFileSync(path.join(options.certificateStorePath, "account-key.pem"))
            return new acme.Client({ directoryUrl, accountKey });
        } else {
            
            if(!fs.existsSync(options.certificateStorePath)){
                ACMEEvents.log(`Certificate store path "${options.certificateStorePath}" does not exist. Creating directory...`);
                fs.mkdirSync(options.certificateStorePath, { recursive: true });
            }

            let accountKey: acme.PrivateKeyBuffer = await acme.forge.createPrivateKey()
            const client: acme.Client = new acme.Client({ directoryUrl, accountKey });
            
            await client.createAccount({
                termsOfServiceAgreed: options.agreedTermsOfService,
                contact: [`mailto:${options.email}`]
            })

            fs.writeFileSync(path.join(options.certificateStorePath, "account-key.pem"), accountKey);

            return client
        }
    }

    public async createCSR(domain: string): Promise<CreateCSRResult>{
        const certificateKey: acme.PrivateKeyBuffer = await acme.forge.createPrivateKey(2048);
        
        const [privateKey, csrBuffer] = await acme.forge.createCsr({
            commonName: domain,
            altNames: [domain]
        }, certificateKey);

        return { privateKey, csrBuffer };
    }

    public async requestCertificate(client: acme.Client, options: IssueCertificateOptions, challengeDir: string, csrBuffer: acme.CsrBuffer){

        //Send all 15 seconds a log to inform the user that the process is still running
        let progressInterval: NodeJS.Timeout;

        const onHandlerCreated = () => {
            let seconds: number = 0;
            progressInterval = setInterval(() => {
                seconds += 15;
                ACMEEvents.log(`Waiting for ACME challenge validation for domain ${options.domain}... (${seconds} seconds elapsed)`);
            }, 15000);
        };

        try {
    
            const challengeHandler: IACMEChallenge = new HTTP01Challenge()
            // options.challengeType === "http-01"
                // ? new HTTP01Challenge()
                // : new DNS01Challenge();
            
            ACMEEvents.log(`Starting certificate request for domain ${options.domain} with challenge type ${options.challengeType}`);

            const timeoutPromise = new Promise<never>((_, reject) =>  setTimeout(() => reject(new Error(`Timeout: ACME challenge validation for domain ${options.domain} took longer than 2 minutes. The domain might be unreachable.`)), 120000));

            //Zertifikat anfragen
            const certificatePromise: Promise<string> = client.auto({
                csr: csrBuffer,
                email: options.email,
                termsOfServiceAgreed: options.agreedTermsOfService,
                challengePriority: [options.challengeType],
                challengeCreateFn: (authz, challenge, keyAuth) => 
                    challengeHandler.create(authz, challenge, keyAuth, challengeDir, onHandlerCreated),
                challengeRemoveFn: (authz: any, challenge: any, keyAuthorization: string) =>  
                    challengeHandler.remove(authz, challenge, keyAuthorization, challengeDir, progressInterval)
            })

            const certificate: string = await Promise.race([certificatePromise, timeoutPromise]);

            return certificate
        } catch (error) {
            clearInterval(progressInterval!);
            throw error
        }
    }

    public async saveCertificate(options: IssueCertificateOptions, certificate: string, privateKey: acme.PrivateKeyBuffer): Promise<ACMEResponse<ACMEStoreResult>>{

        if(!fs.existsSync(options.certificateStorePath)) fs.mkdirSync(options.certificateStorePath, { recursive: true });

        const certificatePath = path.join(options.certificateStorePath, `${options.domain}-cert.pem`);
        const privateKeyPath = path.join(options.certificateStorePath, `${options.domain}-key.pem`);

        fs.writeFileSync(certificatePath, certificate);
        fs.writeFileSync(privateKeyPath, privateKey);

        ACMEEvents.log(`Certificate and private key saved successfully for domain ${options.domain} at "${options.certificateStorePath}".`);

        const certInfo: acme.CertificateInfo = await acme.forge.readCertificateInfo(certificate);
        return {
            success: true,
            data: {
                domain: options.domain,
                certPath: certificatePath,
                privateKeyPath: privateKeyPath,
                notAfter: certInfo.notAfter,
                notBefore: certInfo.notBefore
            }
        }
    }

}