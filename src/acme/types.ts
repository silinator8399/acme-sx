import acme from 'acme-client';

export interface CreateCSRResult{
    privateKey: acme.PrivateKeyBuffer; 
    csrBuffer: acme.CsrBuffer
}