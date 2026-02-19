import express from "express";
import http from 'http';
import { ACMEClientOptionsManaged, ACMEResponse } from "../../client/types";
import ACMEManagedServerTypes from "./types";
import { ACMEEvents } from "../../main";
import fs from "fs"
import { randomBytes } from "crypto";
import path from "path";
import { HostedManagerBase } from "../hosted-base";


export class HostedManaged extends HostedManagerBase{

    private server: http.Server | null = null;
    
    public async startServer(): Promise<ACMEResponse>{
        return new Promise(resolve => {
            const app: express.Express = express();
            app.use('/.well-known/acme-challenge', express.static("./acme-challenges"))
            app.get('/', (req, res) => res.json({server_code: "ACME_SERVER_SM", message: 'AFS-ACME-Server is running'}));
    
            this.server = http.createServer(app)
    
            this.server.on("error", (error: ACMEManagedServerTypes.ExpressError)=> {

                ACMEEvents.error((error.message || "Error while starting the server"), error.stack)
    
                if(error.code === 'EADDRINUSE')
                    return resolve({
                        success: false,
                        error: `The port 80 is already in use. Please free the port and try again.`,
                        stack: error.stack
                    })
                return resolve({
                    success: false,
                    error: `Error while starting the server: ${error.message}`,
                    stack: error.stack
                })
            })
    
            this.server.listen(80, ()=> resolve({ success: true, data: undefined}));
        })
    }

    public async stopServer(){
        if(this.server) this.server.close()
    }

    public async testReachability(domain: string): Promise<ACMEResponse>{
        if(!fs.existsSync("./acme-challenges")) fs.mkdirSync("./acme-challenges")

        const challengeDirectory: string = path.join('./', "acme-challenges")
        const { fileName, fileContent, filePath} = await this.createTestFile(challengeDirectory)

        const url: string = `http://${domain}:80/.well-known/acme-challenge/${fileName}`;
        const httpResponse: ACMEResponse = await this.testHttpChallengeReachability(url, fileContent)
        fs.rmSync(filePath)
        
        return httpResponse
    }
    
}