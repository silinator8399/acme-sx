
import { HostedManaged } from "../hosted/managed/hosted-managed";
import { HostedSelf } from "../hosted/self/self-hostet";
import { ACMEEvents } from "../main";
import acme from 'acme-client';
import { ACMEClientOptions, ACMEConvertPFXOptions, ACMEResponse, ACMEStoreResult, HOSTED_TYPE, IssueCertificateOptions } from "./types";
import { ACMESM } from "../acme/acme";
import fs from "fs"
import * as forge from "node-forge";
import path from "path";

export class ACMEClientSX{

    private readonly options: ACMEClientOptions ;

    constructor(options: ACMEClientOptions){
        this.options = { 
            staging: false,
            ...options
        };
    }

    public async testChallengeReachability(domain: string): Promise<ACMEResponse>{

        if(this.options.hosted === HOSTED_TYPE.MANAGED){
            ACMEEvents.log(`Testing challenge reachability for managed hosting at domain: ${domain}`);

            const hostedManager: HostedManaged = new HostedManaged()

            const serverStartResult: ACMEResponse = await hostedManager.startServer()
            if(!serverStartResult.success) return serverStartResult
            ACMEEvents.log(`Managed hosting server started successfully for domain: ${domain}`);

            const testResult: ACMEResponse = await hostedManager.testReachability(domain)
            hostedManager.stopServer()
            
            return testResult

        }else{
            ACMEEvents.log(`Testing challenge reachability for self hosting at domain: ${domain}`);
            ACMEEvents.log(`Using challenge directory: ${this.options.challengeDirectory}`);

            const hostedManager = new HostedSelf()
            return await hostedManager.testReachability(domain, this.options.challengeDirectory)
        }
    }

    public async issueCertificate(options: IssueCertificateOptions): Promise<ACMEResponse<ACMEStoreResult>>{

        let hostedManager: HostedManaged | undefined = undefined
        let challengeDir: string = "./acme-challenges"

        if(this.options.hosted === HOSTED_TYPE.MANAGED){
            ACMEEvents.log(`Issuing certificate for managed hosting at domain: ${options.domain}`);

            //start server to serve challenges
            hostedManager = new HostedManaged()

            const serverStartResult: ACMEResponse = await hostedManager.startServer()
            if(!serverStartResult.success) return serverStartResult

            ACMEEvents.log(`Managed hosting server started successfully for domain: ${options.domain}`)

        }else challengeDir = this.options.challengeDirectory

        try {
            const acme: ACMESM = new ACMESM();
    
            const client: acme.Client = await acme.createClient(options, this.options.staging || false);
            ACMEEvents.log(`ACME client created successfully for domain: ${options.domain}`);
    
            const { privateKey, csrBuffer } = await acme.createCSR(options.domain);
            ACMEEvents.log(`CSR created successfully for domain: ${options.domain}`);
    
            const certificate: string = await acme.requestCertificate(client, options, challengeDir, csrBuffer);
            ACMEEvents.log(`Certificate request for domain ${options.domain} completed.`);

            const certStoreResult: ACMEResponse<ACMEStoreResult> =  await acme.saveCertificate(options, certificate, privateKey);
            return certStoreResult;

        } catch (error) {

            const errorMessage = error instanceof Error ? error.message : String(error);
            ACMEEvents.error(`Certificate request failed for domain ${options.domain}: ${errorMessage}`);
            return { success: false, error: errorMessage }     

        } finally {
            if(hostedManager && this.options.hosted === HOSTED_TYPE.MANAGED) await hostedManager.stopServer()
        }
    }

    public static async convertToPFX(options: ACMEConvertPFXOptions): Promise<ACMEResponse<string>>{

        ACMEEvents.log(`Starting PEM to PFX conversion for domain: ${options.domain}`);

        let keyPem: Buffer;
        let certPem: Buffer;

        if(!fs.existsSync(options.certPemPath)){
            const errorText: string = `Certificate PEM file not found at path: ${options.certPemPath}`;
            ACMEEvents.error(errorText);
            return { success: false, error: errorText }
        }

        if(!fs.existsSync(options.keyPemPath)){
            const errorText: string = `Key PEM file not found at path: ${options.keyPemPath}`;
            ACMEEvents.error(errorText);
            return { success: false, error: errorText }
        }

        try {
            certPem = fs.readFileSync(options.certPemPath);
            keyPem = fs.readFileSync(options.keyPemPath);

            const p12Asn1: forge.asn1.Asn1 = forge.pkcs12.toPkcs12Asn1(
                forge.pki.privateKeyFromPem(keyPem.toString()),
                forge.pki.certificateFromPem(certPem.toString()),
                options.passphrase,
                {algorithm: "3des"}
            )

            const p12Der: forge.util.ByteStringBuffer = forge.asn1.toDer(p12Asn1);

            const filePath: string = path.join(path.dirname(options.certPemPath), `${options.domain}.pfx`);

            fs.writeFileSync(filePath, Buffer.from(p12Der.getBytes(), 'binary'));
            ACMEEvents.log(`Successfully converted PEM to PFX at path: ${filePath}`);
            return { success: true, data: filePath }

        

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            ACMEEvents.error(`Failed to convert to PFX: ${errorMessage}`);
            return { success: false, error: errorMessage }
        }

    }
}