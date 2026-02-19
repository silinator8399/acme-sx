import { randomBytes } from "crypto";
import { ACMEEvents, ACMEResponse } from "../main";
import fs from "fs"
import path from "path";

export abstract class HostedManagerBase{

    public async createTestFile(challengeDirectory: string){
        const fileName: string = `test-challenge-${Date.now()}.txt`
        const fileContent: string = randomBytes(32).toString("hex")
        const filePath: string = path.join(challengeDirectory, fileName)
        fs.writeFileSync(filePath , fileContent)
        ACMEEvents.log(`Testfile created for reachability test: ${fileName} with content: ${fileContent}`);
        return { fileName, fileContent, filePath }
    }
    
    public async testHttpChallengeReachability(url: string, fileContent: string): Promise<ACMEResponse>{
        try {
            ACMEEvents.log(`Starting reachability test for URL: ${url}`);
            const response: Response = await fetch( url, { method: "GET"} )
            const body: string = await response.text()

            if(response.status == 200 && body == fileContent) {
                ACMEEvents.log(`Reachability test successful for URL: ${url}`);
                return { success: true, data: undefined }
            }

            const errorMessage: string = `The ACME server is not reachable at "${url}" or does not respond with the expected information. (HttpCode: ${response.status})`
            ACMEEvents.error(errorMessage)

            return { success: false, error: errorMessage }

        } catch (error: any) {
            ACMEEvents.error(`The ACME server is not reachable at "${url}" or does not respond with the expected information.`, error?.stack)
            return {
                success: false,
                error: `AFS-ACME-Server ist nicht unter "${url}" erreichbar oder antwortet nicht mit den erwarteten Informationen.`,
                stack: error instanceof Error ? error.stack : undefined
            }
        }
    }


}