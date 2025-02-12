/*
 * vim: ts=4:sw=4:expandtab
 */
(function () {
    'use strict';
    window.Whisper = window.Whisper || {};
    emoji.init_colons();

    Whisper.ExpiredToast = Whisper.ToastView.extend({
        templateName: 'expired_toast',
        render_attributes: function() {
            return {
                expiredWarning: i18n('expiredWarning')
            };
        }
    });

    Whisper.ConversationView = Whisper.View.extend({
        className: function() {
            return [ 'conversation', this.model.get('type') ].join(' ');
        },
        id: function() {
            return 'conversation-' + this.model.cid;
        },
        template: $('#conversation').html(),
        render_attributes: function() {
            return {
                group: this.model.get('type') === 'group',
                name: this.model.getName(),
                number: this.model.getNumber(),
                avatar: this.model.getAvatar(),
                'view-members'    : i18n('members'),
                'end-session'     : i18n('resetSession'),
                'verify-identity' : i18n('verifyIdentity'),
                'destroy'         : i18n('deleteMessages'),
                'send-message'    : i18n('sendMessage')
            };
        },
        initialize: function(options) {
            this.listenTo(this.model, 'destroy', this.stopListening);
            this.listenTo(this.model, 'change:avatar', this.updateAvatar);
            this.listenTo(this.model, 'change:name', this.updateTitle);
            this.listenTo(this.model, 'newmessage', this.addMessage);
            this.listenTo(this.model, 'opened', this.onOpened);

            this.render();

            twemoji.parse(this.el, { base: '/images/twemoji/', size: 16 });

            this.appWindow = options.appWindow;
            this.fileInput = new Whisper.FileInputView({
                el: this.$('form.send'),
                window: this.appWindow.contentWindow
            });

            this.view = new Whisper.MessageListView({
                collection: this.model.messageCollection,
                window: this.appWindow.contentWindow
            });
            this.$('.discussion-container').append(this.view.el);
            this.view.render();

            this.$messageField = this.$('.send-message');

            var onResize = this.forceUpdateMessageFieldSize.bind(this);
            this.appWindow.contentWindow.addEventListener('resize', onResize);

            var onFocus = function() {
                if (this.$el.css('display') !== 'none') {
                    this.markRead();
                }
            }.bind(this);
            this.appWindow.contentWindow.addEventListener('focus', onFocus);

            this.appWindow.onClosed.addListener(function () {
                this.appWindow.contentWindow.removeEventListener('resize', onResize);
                this.appWindow.contentWindow.removeEventListener('focus', onFocus);
                window.autosize.destroy(this.$messageField);
                this.remove();
                this.model.messageCollection.reset([]);
            }.bind(this));

            this.fetchMessages();

            this.$('.send-message').focus(this.focusBottomBar.bind(this));
            this.$('.send-message').blur(this.unfocusBottomBar.bind(this));
        },

        events: {
            'submit .send': 'sendMessage',
            'input .send-message': 'updateMessageFieldSize',
            'keydown .send-message': 'updateMessageFieldSize',
            'click .destroy': 'destroyMessages',
            'click .end-session': 'endSession',
            'click .leave-group': 'leaveGroup',
            'click .update-group': 'newGroupUpdate',
            'click .verify-identity': 'verifyIdentity',
            'click .view-members': 'viewMembers',
            'click .conversation-menu .hamburger': 'toggleMenu',
            'click .openInbox' : 'openInbox',
            'click' : 'onClick',
            'click .bottom-bar': 'focusMessageField',
            'click .back': 'resetPanel',
            'focus .send-message': 'focusBottomBar',
            'blur .send-message': 'unfocusBottomBar',
            'loadMore .message-list': 'fetchMessages',
            'close .menu': 'closeMenu',
            'select .message-list .entry': 'messageDetail',
            'force-resize': 'forceUpdateMessageFieldSize'
        },

        unfocusBottomBar: function() {
            this.$('.bottom-bar form').removeClass('active');
        },
        focusBottomBar: function() {
            this.$('.bottom-bar form').addClass('active');
        },

        onOpened: function() {
            this.view.resetScrollPosition();
            this.$el.trigger('force-resize');
            this.focusMessageField();
            this.model.markRead();
        },

        focusMessageField: function() {
            this.$messageField.focus();
        },

        fetchMessages: function() {
            console.log('fetchMessages');
            this.$('.bar-container').show();
            return this.model.fetchContacts().then(function() {
                return this.model.fetchMessages().then(function() {
                    this.$('.bar-container').hide();
                }.bind(this));
            }.bind(this));
            // TODO catch?
        },

        addMessage: function(message) {
            this.model.messageCollection.add(message, {merge: true});

            if (!this.isHidden() && window.isFocused()) {
                this.markRead();
            }
        },

        viewMembers: function() {
            return this.model.fetchContacts().then(function() {
                var view = new Whisper.GroupMemberList({ model: this.model });
                this.listenBack(view);
            }.bind(this));
        },

        openInbox: function() {
            openInbox();
        },

        onClick: function(e) {
            this.closeMenu(e);
            this.markRead(e);
        },

        markRead: function(e) {
            this.model.markRead();
        },

        verifyIdentity: function() {
            if (this.model.isPrivate()) {
                var their_number = this.model.id;
                var our_number = textsecure.storage.user.getNumber();
                textsecure.storage.protocol.loadIdentityKey(their_number).then(function(their_key) {
                    textsecure.storage.protocol.loadIdentityKey(our_number).then(function(our_key) {
                        var view = new Whisper.KeyVerificationPanelView({
                            model: { their_key: their_key, your_key: our_key }
                        }).render();
                        this.listenBack(view);
                    }.bind(this));
                }.bind(this));
            }
        },

        messageDetail: function(e, data) {
            var view = new Whisper.MessageDetailView({
                model: data.message,
                conversation: this.model
            });
            this.listenBack(view);
            view.render();
        },

        listenBack: function(view) {
            this.panel = view;
            this.$('.main.panel, .menu').hide();
            this.$('.back').show();
            view.$el.insertBefore(this.$('.panel'));
        },
        resetPanel: function() {
            this.panel.remove();
            this.$('.main.panel, .menu').show();
            this.$('.back').hide();
            this.$el.trigger('force-resize');
        },

        closeMenu: function(e) {
            if (e && !$(e.target).hasClass('hamburger')) {
                this.$('.menu-list').hide();
            }
        },

        endSession: function() {
            this.model.endSession();
            this.$('.menu-list').hide();
        },

        leaveGroup: function() {
            this.model.leaveGroup();
            this.$('.menu-list').hide();
        },

        toggleMenu: function() {
            this.$('.menu-list').toggle();
        },

        newGroupUpdate: function() {
            this.newGroupUpdateView = new Whisper.NewGroupUpdateView({
                model: this.model,
                window: this.appWindow.contentWindow
            });
            this.listenBack(this.newGroupUpdateView);
        },

        destroyMessages: function(e) {
            this.confirm("Permanently delete this conversation?").then(function() {
                this.model.destroyMessages();
                this.remove();
            }.bind(this)).catch(function() {
                // clicked cancel, nothing to do.
            });
            this.$('.menu-list').hide();
        },

        sendMessage: function(e) {
            if (extension.expired()) {
                var toast = new Whisper.ExpiredToast();
                toast.$el.insertAfter(this.$el);
                toast.render();
                return;
            }
            e.preventDefault();
            var input = this.$messageField;
            var message = this.replace_colons(input.val()).trim();
            var convo = this.model;

            if (message.length > 0 || this.fileInput.hasFiles()) {
                this.fileInput.getFiles().then(function(attachments) {
                    convo.sendMessage(message, attachments);
                });
                input.val("");
                this.forceUpdateMessageFieldSize(e);
                this.fileInput.deleteFiles();
            }
        },

        replace_colons: function(str) {
            return str.replace(emoji.rx_colons, function(m) {
                var idx = m.substr(1, m.length-2);
                var val = emoji.map.colons[idx];
                if (val) {
                    return emoji.data[val][0][0];
                } else {
                    return m;
                }
            });
        },

        updateTitle: function() {
            this.$('.conversation-title').text(this.model.getTitle());
        },

        updateAvatar: function() {
            var avatarView = new (Whisper.View.extend({
                templateName: 'avatar',
                render_attributes: { avatar: this.model.getAvatar() }
            }))();
            this.$('.conversation-header .avatar').replaceWith(avatarView.render().$('.avatar'));
        },

        updateMessageFieldSize: function (event) {
            var keyCode = event.which || event.keyCode;

            if (keyCode === 13 && !event.altKey && !event.shiftKey && !event.ctrlKey) {
                // enter pressed - submit the form now
                event.preventDefault();
                return this.$('.bottom-bar form').submit();
            }

            this.view.measureScrollPosition();
            window.autosize(this.$messageField);

            var $attachmentPreviews = this.$('.attachment-previews'),
                $bottomBar = this.$('.bottom-bar');

            $bottomBar.outerHeight(
                    this.$messageField.outerHeight() +
                    $attachmentPreviews.outerHeight() + 11);

            this.view.scrollToBottomIfNeeded();
        },

        forceUpdateMessageFieldSize: function (event) {
            if (this.isHidden()) {
                return;
            }
            this.view.scrollToBottomIfNeeded();
            window.autosize.update(this.$messageField);
            this.updateMessageFieldSize(event);
        },

        isHidden: function() {
            return (this.$el.css('display') === 'none') || this.$('.panel').css('display') === 'none';
        }
    });
})();
