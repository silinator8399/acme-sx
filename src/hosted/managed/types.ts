 namespace ACMEManagedServerTypes {

    export interface ExpressError extends Error {
        code?: string
    }

    export type ACMEServerCode = "AFS_ACME_SERVER";

    export interface ACMEServerInformations{
        server_code: ACMEServerCode
        message: string
    }

}

export default ACMEManagedServerTypes;