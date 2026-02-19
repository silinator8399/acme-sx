import { IssueCertificateOptions } from "../../main";

export interface IACMEChallenge{
    create(authz: any, challenge: any, keyAuthorization: string, challengeDir: string, onHandlerCreated: () => void): Promise<void>;
    remove(authz: any, challenge: any, keyAuthorization: string, challengeDir: string, progressInterval: NodeJS.Timeout): Promise<void>;
}