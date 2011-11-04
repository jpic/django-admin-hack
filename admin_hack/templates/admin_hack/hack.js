{% if change_view %}
(function($) { $(document).ready(function() {
    ChangeView = function(options) {
        this.options = $.extend({
            'hi': 'lol',
        }, options)
        this.forms = {{ forms_json|safe }};
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
                        $('.form-row').each(function() {
                            var hide = true;
                            for ( var j in cv.forms[i].field_set ) {
                                var name = cv.forms[i].field_set[j].name;
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
                    }
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

    var change_view = new ChangeView()
    change_view.installSelect($('#content-main'));
}); })(django.jQuery)
{% endif %}
