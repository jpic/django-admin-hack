{% load url from future %}
{% load i18n %}
{% load admin_hack_tags %}

function admin_hack_html_tag_factory(tag, attributes, contents) {
    var html = '<' + tag;
    for(var key in attributes) {
        html += ' ' + key + '="' + attributes[key] + '"';
    }   
    html += '>' + contents
    html += '</' + tag + '>';
    return html;
}

var head= document.getElementsByTagName('head')[0];
var script= document.createElement('script');
script.type= 'text/javascript';
script.src='{{ STATIC_URL }}admin_hack/jquery.json.min.js';
head.appendChild(script);

(function($) { $(document).ready(function() {
    // make jQuery compatible with django
    $.ajaxSettings.traditional = true;
 
    function save_forms(forms) {
        $.post(
            '{% url 'admin_hack_forms_update' %}', {
                'forms': $.toJSON(forms),
            }
        );
    }

    /* {{{ UserProfile */
    UserProfile = function(data) {
        this.data = data;

        up = this;
        $(document).bind('admin_hack.ChangeView.changeSelectForm', 
            function(e, select, form) {
                up.selectForm(select, form);
                up.save();
            }
        );
    }
    UserProfile.prototype = {
        selectForm: function(select, form) {
            var remove = []

            for(var i=this.data.forms.length-1; i>=0; i--)
                if (form.contenttype.pk == this.data.forms[i].contenttype.pk)
                    this.data.forms.splice(i, 1);
            
            this.data.forms.push(form);
        },
        save: function() {
            var data = {
                forms: [],
                user: this.data.pk,
            };

            for (var i in this.data.forms)
                data.forms.push(this.data.forms[i].pk)

            $.post(
                '{% url 'admin_hack_user_profile_update' request.user.pk %}',
                data
            );
        }
    }
    /* }}} */


    /* {{{ ModeManager */
    ModeManager = {
        modes: [],
        mode: false,
        setMode: function(name) {
            if (this.mode) {
                this.mode.disable();
            }

            if (name) {
                this.mode = this.modes[name];
                this.mode.enable();
            } else {
                this.mode = false;
            }
        },
        install: function(cv) {
            this.cv = cv;

            $(document).bind('admin_hack.ChangeView.changeSelectForm', 
                function(e, select, form) {
                    /* No modes for 'full' form */
                    if (cv.form.name == 'full') {
                        $('.hide_on_full').slideUp();
                    } else {
                        $('.hide_on_full').slideDown();
                    }

                    /* Disable current mode on form change */
                    if (ModeManager.mode) {
                        ModeManager.mode.disable(this.cv);
                    }
                }
            );
        },
        installMode: function(mode) {
            this.modes[mode.name] = mode;
            mode.install(this.cv.container, this.cv)

            $('#admin_hack_mode_' + mode.name).click(function() {
                if ($(this).hasClass('enabled')) {
                    ModeManager.setMode()
                } else {
                    ModeManager.setMode(mode.name)
                }
            });
        }
    }
    /* }}} */

    /* {{{ HideMode */
    HideMode = function(name) {
        this.name = name;
        ModeManager.modes[name] = this;
    }
    HideMode.prototype = {
        enable: function() {
            var button = admin_hack_html_tag_factory('span', {
                'class': 'btn danger admin_hack_mode_' + this.name,
                'title': "{% trans 'Hide this field' %}",
            }, "{% trans 'Remove' %}");

            $('label').each(function() {
                if ($(this).hasClass('required')) {
                    return
                }
                $(this).append(button);
            });

            $('#admin_hack_mode_' + this.name).addClass('success');
            $('#admin_hack_mode_' + this.name).addClass('enabled');
            $('#admin_hack_mode_' + this.name).html(
                "{% trans 'Save your changes' %}");
            this.enabled = true;
        },
        disable: function() {
            $('.admin_hack_mode_' + this.name).hide();
            $('#admin_hack_mode_' + this.name).removeClass('success');
            $('#admin_hack_mode_' + this.name).removeClass('enabled');
            $('#admin_hack_mode_' + this.name).html("{% trans 'Remove fields' %}");
            this.enabled = false;
            $(document).trigger('admin_hack.ChangeView.save');
        },
        install: function(container, cv) {
            container.append(admin_hack_html_tag_factory('span', {
                'class': 'btn hide_on_full',
                'style': 'display:none',
                'title': "{% trans 'Remove a field from the selected form model with the remove field mode' %}",
                'id': 'admin_hack_mode_' + this.name,
            }, "{% trans 'Remove fields' %}"));

            $('.admin_hack_mode_' + this.name).live('click', function() {
                var strip_id_re = /^id_/;
                var id = $(this).parent().attr('for');
                var name = id.replace(strip_id_re, '');

                var is_autocomplete_re = /_text$/
                if (name.match(is_autocomplete_re)) {
                    if ($('#id_'+ name.replace(is_autocomplete_re, '_on_deck')).length) {
                        name = name.replace(is_autocomplete_re, '');
                    }
                }
                for ( var i in cv.form.field_set ) {
                    if (name == cv.form.field_set[i].name) {
                        cv.form.field_set.splice(i, 1);
                        cv.updateForm(cv.select, cv.form);
                        break;
                    }
                }
            });
        }
    }
    /* }}} */
    /* {{{ ShowMode */
    ShowMode = function(name) {
        this.name = name;
        ModeManager.modes[name] = this;
    }
    ShowMode.prototype = {
        enable: function() {
            var button = admin_hack_html_tag_factory('span', {
                'class': 'btn success admin_hack_mode_' + this.name,
                'title': "{% trans 'Show this field in the current form configuration' %}",
            }, "{% trans 'Keep' %}");

            $('.admin_hack_hidden').each(function() {
                $(this).removeClass('admin_hack_hidden');
                $(this).find('label').append(button);
            });

            $('#admin_hack_mode_' + this.name).addClass('success');
            $('#admin_hack_mode_' + this.name).addClass('enabled');
            $('#admin_hack_mode_' + this.name).html(
                "{% trans 'Save your changes' %}");
            this.enabled = true;
        },
        disable: function() {
            $('.admin_hack_mode_' + this.name).hide();
            $('#admin_hack_mode_' + this.name).removeClass('success');
            $('#admin_hack_mode_' + this.name).removeClass('enabled');
            $('#admin_hack_mode_' + this.name).html("{% trans 'Add fields' %}");
            this.enabled = false;
            $(document).trigger('admin_hack.ChangeView.updateForm');
            $(document).trigger('admin_hack.ChangeView.save');
        },
        install: function(container, cv) {
            container.append(admin_hack_html_tag_factory('span', {
                'class': 'btn hide_on_full',
                'style': 'display:none',
                'title': "{% trans 'Show all fields available for your form model allowing you to click-choose which fields you want to add' %}",
                'id': 'admin_hack_mode_' + this.name,
            }, "{% trans 'Add fields' %}"));

            $('.admin_hack_mode_' + this.name).live('click', function() {
                var strip_id_re = /^id_/;
                var id = $(this).parent().attr('for');
                var name = id.replace(strip_id_re, '');

                var is_autocomplete_re = /_text$/
                if (name.match(is_autocomplete_re)) {
                    if ($('#id_'+ name.replace(is_autocomplete_re, '_on_deck')).length) {
                        name = name.replace(is_autocomplete_re, '');
                    }
                }

                cv.form.field_set.push({'name':name})
                $(this).remove();
            });
        }
    }
    /* }}} */

    /* {{{ ChangeView */
    ChangeView = function(forms) {
        this.forms = forms;
        var cv = this;

        $(document).bind('admin_hack.ChangeView.changeSelectForm', 
            function(e, select, form) {
                cv.form = form;
                cv.updateForm(select, form);
            }
        );
    }

    ChangeView.prototype = {
        install: function(main) {
            if (!$('#admin_hack').length) {
                main.find('.object_tool').before('<div id="admin_hack"></div>');
            }
            this.container = $('#admin_hack');
            this.container.append('<p>{% trans 'Select your form model:' %}</p>');
            this.container.append(change_view.renderSelect());
            this.select = this.container.find('select');

            cv = this;
            this.select.change(function() {
                for ( var i in cv.forms ) {
                    if ( cv.forms[i].pk == $(this).val() ) {
                        $(document).trigger(
                            'admin_hack.ChangeView.changeSelectForm', 
                            [$(this), cv.forms[i]]
                        );
                        break;
                    }
                }
            });

            $(document).bind('admin_hack.ChangeView.updateForm', function() {
                cv.updateForm(cv.select, cv.form);
            });
            $(document).bind('admin_hack.ChangeView.save', function() {
                save_forms(cv.forms);
            });
        },
        updateForm: function(select, form) {
            cv = this;

            $('.form-row').each(function() {
                if ($(this).find('.field-box').length > 0) {
                    /* pass on form rows with multiple fields */
                    return;
                }

                var hide = true;
                for ( var i in form.field_set ) {
                    var name = form.field_set[i].name;
                    if ( $(this).hasClass(name) ) {
                        hide = false;
                    }
                }

                if (hide) {
                    $(this).addClass('admin_hack_hidden');
                } else {
                    $(this).removeClass('admin_hack_hidden');
                }
            });

            $('.field-box').each(function() {
                var hide = true;

                for ( var i in form.field_set ) {
                    var name = form.field_set[i].name;
                    if ( $(this).find('[name='+name+']').length ) {
                        hide = false;
                    }
                }

                if (hide) {
                    $(this).addClass('admin_hack_hidden');
                } else {
                    $(this).removeClass('admin_hack_hidden');
                }
            });

            $('.form-row').each(function() {
                if ($(this).find('.field-box').length == 0) {
                    return;
                }
                
                var all_hidden = true;

                $(this).find('.field-box').each(function() {
                    if (! $(this).hasClass('admin_hack_hidden')) {
                        all_hidden = false;
                    }
                });

                if (all_hidden) {
                    $(this).addClass('admin_hack_hidden');
                } else {
                    $(this).removeClass('admin_hack_hidden');
                }
            });

            $('fieldset.module').each(function() {
                /* pass on inlines for the moment */
                if ($(this).parent().hasClass('inline-related')) {
                    return;
                }

                /* if all rows are hidden then hide the module */
                /* console.log($(this).find('h2').html(), $(this).hasClass('collapsed'), $(this).is(':visible')); */
                if ($(this).find('.form-row:not(.admin_hack_hidden)').length == 0) {
                    $(this).addClass('admin_hack_hidden');
                    $(this).find('h2').addClass('admin_hack_hidden');
                } else {
                    $(this).removeClass('admin_hack_hidden');
                    $(this).find('h2').removeClass('admin_hack_hidden');
                }
            });
        },
        renderSelect: function() {
            if (!this.forms.length) {
                return '';
            }

            var html = [
                '<select id="_preset_change" style="display:inline; vertical-align: top;">',
            ];
            for (var i in this.forms) {
                html.push('<option value="' + this.forms[i].pk + '">');
                html.push(this.forms[i].name);
                html.push('</option>');
            }

            return html.join('');
        },
    }
    /* }}} */

    var user_profile = new UserProfile({{ request.user.adminhackuserprofile.to_dict|as_json }});

    {% if change_view %}
        var change_view = new ChangeView({{ forms_dict|as_json }});
        var main = $('#content-main')
        change_view.install(main, user_profile);

        ModeManager.install(change_view)
        
        var hide_mode = new HideMode('hide');
        ModeManager.installMode(hide_mode, change_view);

        var show_mode = new ShowMode('show');
        ModeManager.installMode(show_mode, change_view);

            {% if last_form_pk %}
                change_view.select.val({{ last_form_pk }});
                change_view.select.trigger('change');
            {% endif %}

        $('div.tabular.inline-related table').each(function() {
            if ($(this).find('tbody tr:not(.empty-form)').length == 0) {
                $(this).find('thead').hide();
            }
        });
    {% endif %}
}); })(django.jQuery)

$ = jQuery = django.jQuery
