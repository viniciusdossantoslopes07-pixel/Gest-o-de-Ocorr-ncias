
/**
 * WebAuthn Helper Service for Guardião GSD-SP
 * Handles biometric registration and authentication
 */

// Helper to convert ArrayBuffer to Base64
const bufferToBase64 = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

// Helper to convert Base64 to Uint8Array
const base64ToBuffer = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

export const isWebAuthnSupported = (): boolean => {
    return !!(window.PublicKeyCredential &&
        navigator.credentials &&
        navigator.credentials.create);
};

export const registerBiometrics = async (username: string, userId: string): Promise<any> => {
    if (!isWebAuthnSupported()) throw new Error('WebAuthn não suportado neste navegador.');

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
            name: "Guardião GSD-SP",
            id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
        },
        user: {
            id: base64ToBuffer(btoa(userId)) as any,
            name: username,
            displayName: username,
        },
        pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
            userVerification: "preferred",
            residentKey: "preferred",
        },
        timeout: 60000,
    };

    const credential = await navigator.credentials.create({
        publicKey
    }) as PublicKeyCredential;

    if (!credential) throw new Error('Falha ao criar credencial.');

    // Store essential data as base64/strings
    return {
        id: credential.id,
        rawId: bufferToBase64(credential.rawId),
        type: credential.type,
    };
};

export const authenticateBiometrics = async (savedCredentialId: string): Promise<boolean> => {
    if (!isWebAuthnSupported()) throw new Error('WebAuthn não suportado.');

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [
            {
                id: base64ToBuffer(savedCredentialId) as any,
                type: 'public-key',
            },
        ],
        userVerification: "preferred",
        timeout: 60000,
    };

    const assertion = await navigator.credentials.get({
        publicKey
    });

    return !!assertion;
};
