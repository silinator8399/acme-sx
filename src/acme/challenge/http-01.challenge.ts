import { IACMEChallenge } from "./acme-challenge.interface.js";
import fs from "fs"
import path from 'path';
import { IssueCertificateOptions } from "../../main.js";

export class HTTP01Challenge implements IACMEChallenge{
    async create(authz: any, challenge: any, keyAuthorization: string, challengeDir: string, onHandlerCreated: () => void): Promise<void> {
        

        if(!fs.existsSync(challengeDir))
            fs.mkdirSync(challengeDir, { recursive: true });

        fs.writeFileSync(
            path.join(challengeDir, challenge.token),
            keyAuthorization
        );
        
        onHandlerCreated()
    }

    async remove(authz: any, challenge: any, keyAuthorization: string, challengeDir: string, progressInterval: NodeJS.Timeout): Promise<void> {
        clearInterval(progressInterval);
        fs.unlinkSync(path.join(challengeDir, challenge.token));
    }
}
