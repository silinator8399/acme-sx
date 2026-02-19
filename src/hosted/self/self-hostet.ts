import { ACMEEvents, ACMEResponse } from "../../main";
import { HostedManagerBase } from "../hosted-base";
import fs from "fs"

export class HostedSelf extends HostedManagerBase{

    public async testReachability(domain: string, challengeDir: string): Promise<ACMEResponse>{
        if(!fs.existsSync(challengeDir)){
            const errorMessage = `The specified challenge directory "${challengeDir}" does not exist. Please create the directory and try again.`;
            ACMEEvents.error(errorMessage);
            return { success: false, error: errorMessage}
        }
        const { fileName, fileContent, filePath} = await this.createTestFile(challengeDir)

        const url: string = `http://${domain}:80/.well-known/acme-challenge/${fileName}`;
        const httpResponse: ACMEResponse = await this.testHttpChallengeReachability(url, fileContent)
        fs.rmSync(filePath)
        
        return httpResponse
    }
        
}