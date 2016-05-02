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
        startWorker: function() {
            libsignal.protocol.startWorker('/js/libsignal-protocol-worker.js');
        },
        stopWorker: function() {
            libsignal.protocol.stopWorker();
        },
        createIdentityKeyRecvSocket: function() {
            return libsignal.protocol.createIdentityKeyRecvSocket();
        }
    };
})();
