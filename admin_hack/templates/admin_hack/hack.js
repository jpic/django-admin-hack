{% load url from future %}
{% load admin_hack_tags %}

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

    {% if change_view %}
    ChangeView = function(forms) {
        this.forms = forms;
        var cv = this;

        $(document).bind('admin_hack.ChangeView.changeSelectForm', 
            function(e, select, form) {
                cv.updateForm(select, form);
            }
        );
    }

    ChangeView.prototype = {
        installSelect: function(main) {
            main.prev().css('display', 'inline');
            main.before(change_view.renderSelect());
            this.select = main.prev();
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
        },
        updateForm: function(select, form) {
            cv = this;

            $('.form-row').each(function() {
                var hide = true;
                for ( var i in form.field_set ) {
                    var name = form.field_set[i].name;
                    if ( $(this).hasClass(name) ) {
                        hide = false;
                    }
                }

                if (hide) {
                    $(this).hide();
                } else {
                    $(this).show();
                }
            });
        },
        renderSelect: function() {
            if (!this.forms.length) {
                return '';
            }

            var html = [
                '<select id="_preset_change" style="display:inline">',
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
    change_view.installSelect($('#content-main'), user_profile);
        {% if last_form_pk %}
            change_view.select.val({{ last_form_pk }});
            change_view.select.trigger('change');
        {% endif %}
    {% endif %}
}); })(django.jQuery)
