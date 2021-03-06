'use strict'

import base64url from 'base64url'
import { cryptoClients } from './cryptoClients'
import decodeToken from './decode'
import { MissingParametersError } from './errors'

function createSigningInput(payload, header) {
    let tokenParts = []

    // add in the header
    const encodedHeader = base64url.encode(JSON.stringify(header))
    tokenParts.push(encodedHeader)

    // add in the payload
    const encodedPayload = base64url.encode(JSON.stringify(payload))
    tokenParts.push(encodedPayload)

    // prepare the message
    const signingInput = tokenParts.join('.')

    // return the signing input
    return signingInput
}

export function createUnsecuredToken(payload) {
    const header = {typ: 'JWT', alg: 'none'}
    return createSigningInput(payload, header) + '.'
}

export class TokenSigner {
    constructor(signingAlgorithm, rawPrivateKey) {
        if (!(signingAlgorithm && rawPrivateKey)) {
            throw new MissingParametersError(
                'a signing algorithm and private key are required')
        }
        if (typeof signingAlgorithm !== 'string') {
            throw 'signing algorithm parameter must be a string'
        }
        signingAlgorithm = signingAlgorithm.toUpperCase()
        if (!cryptoClients.hasOwnProperty(signingAlgorithm)) {
            throw 'invalid signing algorithm'
        }
        this.tokenType = 'JWT'
        this.cryptoClient = cryptoClients[signingAlgorithm]
        this.rawPrivateKey = rawPrivateKey
    }

    header(header={}) {
        return Object.assign(
            {},
            {
                typ: this.tokenType,
                alg: this.cryptoClient.algorithmName,
            },
            header,
        )
    }

    sign(opts={}, expanded=false) {
        if (
            typeof opts.payload === 'undefined' ||
            typeof opts.payload !== 'object'
        ) {
            throw new MissingParametersError('a payload is required')
        }

        // generate the token header
        const header = this.header(opts.header)

        // prepare the message to be signed
        const signingInput = createSigningInput(
            opts.payload,
            header,
        )
        const signingInputHash = this.cryptoClient.createHash(signingInput)

        // sign the message and add in the signature
        const signature = this.cryptoClient.signHash(
            signingInputHash, this.rawPrivateKey)

        if (expanded) {
            return {
                "header": [
                    base64url.encode(JSON.stringify(header))
                ],
                "payload": JSON.stringify(opts.payload),
                "signature": [
                    signature
                ]
            }
        } else {
            return [signingInput, signature].join('.')
        }
    }
}
