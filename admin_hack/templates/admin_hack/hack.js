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

(function($) { $(document).ready(function() {
    // make jQuery compatible with django
    $.ajaxSettings.traditional = true;
    
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

    {% if list_view %}
    ListView = function() {
        /*$(document).bind('admin_hack.ListView.checkItem', function(e) {
        });*/
    }
    {% endif %}

    {% if change_view %}
    ChangeView = function(forms) {
        this.forms = forms;
        var cv = this;

        $(document).bind('admin_hack.ChangeView.changeSelectForm', 
            function(e, select, form) {
                cv.form = form;
                cv.updateForm(select, form);
                if (cv.form.name == 'full') {
                    $('.hide_on_full').slideUp();
                } else {
                    $('.hide_on_full').slideDown();
                }
            }
        );
    }

    ChangeView.prototype = {
        install: function(main) {
            if (!$('#admin_hack').length) {
                main.find('.object_tool').before('<div id="admin_hack"></div>');
            }
            this.container = $('#admin_hack');
            this.container.prepend(change_view.renderSelect());
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

            this.container.append(admin_hack_html_tag_factory('span', {
                'class': 'btn hide_on_full',
                'style': 'display:none',
                'title': "{% trans 'Hide field' %}",
                'id': 'admin_hack_mode_hide',
            }, "{% trans 'Remove field' %}"));
            this.container.append(admin_hack_html_tag_factory('span', {
                'class': 'btn hide_on_full',
                'style': 'display:none',
                'title': "{% trans 'Show field' %}",
                'id': 'admin_hack_show_field_toggler',
            }, "{% trans 'Add field' %}"));

            $('#admin_hack_mode_hide').click(function() {
                if (!cv.mode) {
                    cv.mode = 'hide';
                    $('label').each(function() {
                        if ($(this).hasClass('required')) {
                            return
                        }

                        $(this).append('<span class="btn danger admin_hack_mode_hide" title="{% trans 'Hide this field' %}">{% trans 'Remove' %}</span>')
                    });
                } else if (cv.mode == 'hide') {
                    cv.mode = false;
                    $('.admin_hack_mode_hide').hide();
                }
            });

            $('.admin_hack_mode_hide').live('click', function() {
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

            $(document).bind('admin_hack.ChangeView.changeSelectForm', function() {
                if (cv.mode) {
                    $('#admin_hack_mode_' + cv.mode).click();
                }
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
                console.log($(this).find('h2').html(), $(this).hasClass('collapsed'), $(this).is(':visible'));
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
        }
    }

    var user_profile = new UserProfile({{ request.user.adminhackuserprofile.to_dict|as_json }});

    var change_view = new ChangeView({{ forms_dict|as_json }});
    var main = $('#content-main')
    change_view.install(main, user_profile);
    {% if last_form_pk %}
        change_view.select.val({{ last_form_pk }});
        change_view.select.trigger('change');
    {% endif %}

    $('div.tabular.inline-related table').each(function() {
        if ($(this).find('tbody tr:not(.empty-form)').length == 0) {
            $(this).find('thead').hide();
        }
    });
    $('.add-row a').live('click', function(e) {
        console.log('hi live')
        $(this).parents('table').find('thead').show();
    });
    $('.add-row a').click(function(e) {
        console.log('hi click')
        $(this).parents('table').find('thead').show();
    });
    {% endif %}

    {% if list_view and smuggler %}
        var html = ['<li><a href="{% url 'dump-model-data' app model %}">'];
        html.push('{% trans 'Export ' %} ')
        html.push('{{ model_verbose_name_plural }}')
        html.push('</a></li>')
        $('ul.object-tools').append(html.join(''));
    {% endif %}
}); })(django.jQuery)

$ = jQuery = django.jQuery

{% endif %}
