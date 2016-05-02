/*
 * vim: ts=4:sw=4:expandtab
 */
;(function() {
    'use strict';
    window.textsecure = window.textsecure || {};
    window.textsecure.storage = window.textsecure.storage || {};

    textsecure.storage.protocol = new SignalProtocolStore();

    window.textsecure = window.textsecure || {};
    window.textsecure.protocol_wrapper = {
        startWorker: function(url) {
            libsignal.protocol.startWorker(url);
        },
        stopWorker: function() {
            libsignal.protocol.stopWorker();
        }
    };
    window.textsecure.ProvisioningCipher = libsignal.ProvisioningCipher;
})();
