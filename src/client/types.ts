
export enum HOSTED_TYPE { MANAGED, SELF }


export type ACMEClientOptions = {

    /**
     * Use the staging server for testing purposes
     * @default false
     */
    staging?: boolean,

    /**
     * Self hosted or managed Server
     * Managed: Package will start a server to respond to challenges
     * Self: User is responsible for responding to challenges
     */
    hosted: HOSTED_TYPE

    
} & (ACMEClientOptionsManaged | ACMEClientOptionsSelf)

export type ACMEClientOptionsManaged = {
    /**
     * Managed hosting type options
     */
    hosted: HOSTED_TYPE.MANAGED
}

export type ACMEClientOptionsSelf = {

    /**
     * Self hosted type options
     */
    hosted: HOSTED_TYPE.SELF,

    /**
     * Directory to place challenge files in
     */
    challengeDirectory: string
}

export interface IssueCertificateOptions{

    /**
     * Email for the certificate registration
     */
    email: string

    /**
     * Domain to issue the certificate for
     */
    domain: string

    /**
     * Path to store the certificate files
     */
    certificateStorePath: string

    /**
     * Agree to the terms of service
     */
    agreedTermsOfService: boolean

    /**
     * Challenge type to use
     */
    challengeType: 'http-01' // 'dns-01' will be supported later

}

export interface ACMEStoreResult{
    domain: string,
    certPath: string
    privateKeyPath: string
    notAfter: Date
    notBefore: Date
}

export type ACMEResponse<T = undefined> = {
    success: boolean,
} & (ACMEErrorResponse | ACMESuccessResponse<T >)

export type ACMEErrorResponse = {
    success: false,
    stack?: string
    error: string,
}

export type ACMESuccessResponse<T> = {
    success: true,
    data: T
}
