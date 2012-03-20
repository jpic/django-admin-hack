{% load url from future %}
{% load i18n %}
{% load admin_hack_tags %}

$ = jQuery = django.jQuery

function slugify(text) {
    text = text.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
    text = text.replace(/-/gi, "_");
    text = text.replace(/\s/gi, "-");
    return text.toLowerCase();
}

function admin_hack_html_tag_factory(tag, attributes, contents) {
    var html = '<' + tag;
    for(var key in attributes) {
        html += ' ' + key + '="' + attributes[key] + '"';
    }   
    html += '>' + contents
    html += '</' + tag + '>';
    return html;
}

function form_row_factory(label, name, kind) {
    html = ['<div class="form-row '+name+'">'];
    custom_value = false;
    
    $('.custom-values_tab tr').each(function() {
        if ($(this).find('td.name input').val() == name) {
            custom_value = $(this);
        }
    });

    if (custom_value) {
    } else {
    }
    
    html.push('</div>');
}

$(document).ready(function() {
    $('.ui-autocomplete-input').live('focus', function() {
        if (!$.trim($(this).val())) {
            $(this).autocomplete('search', ' ');
        }
    });
});

{% if list_view %}
$(document).ready(function() {
    $select = $('select[name=action]');
    $options = $select.find('option');
    $object_tools = $('ul.object-tools');
    $options.each(function() {
        // pass on empty option
        if (!$(this).attr('value')) return;

        var html = ['<li><a class="action_hack value_'];
        html.push($(this).attr('value'));
        html.push('" href="javascript:;" title="')
        html.push($(this).html());
        html.push('">');
        html.push($(this).html());
        html.push('</a></li>');
        $object_tools.append(html.join(''));
    })
});
{% endif %}

{% if change_view %}

var customvalue_re = /customvalue_set-(\d+)-([a-z]+)_value/;
var customvalue_kind_re = /customvalue_set-(\d+)-kind/;
var customvalue_name_re = /customvalue_set-(\d+)-name/;

var strip_id_re = /^id_/;
var is_autocomplete_re = /_text$/
function get_field_name(e) {
    if (!e.is('.form-row')) {
        e = e.parents('.form-row');
    }
    
    var custom_name = false;
    e.find('input').each(function() {
        if ($(this).attr('name').match(customvalue_name_re)) {
            custom_name = $(this);
        }
    });

    if (custom_name) {
        var name = custom_name.val();
    } else {
        var id = e.find('label').attr('for');
        var name = id.replace(strip_id_re, '');

        if (name.match(is_autocomplete_re)) {
            if ($('#id_'+ name.replace(is_autocomplete_re, '_on_deck')).length) {
                name = name.replace(is_autocomplete_re, '');
            }
        }
    }

    return name
}

function get_field_container(name) {
    var test = $('.form-row.' + name);
    if (test.length) return test;
    var test = $('.form-row.' + slugify(name));
    if (test.length) return test;
}

function get_fieldset_h2(fieldset) {
    var children = fieldset.children();

    if (children.length) {
        var child = children[0];
        if ($(child).is('h2')) {
            return $(child);
        }
    }

    if (fieldset.parent().is('.inline-group'))
        return fieldset.parent().children('h2');
}

var fieldset_re = /[^(]+/;
function get_fieldset_name(fieldset) {
    var fieldset_name = '';
    var fieldset_h2 = get_fieldset_h2(fieldset);
    if (fieldset_h2) 
        return $.trim(fieldset_h2.html().match(fieldset_re));
}

function get_field_fieldset(e) {
    if (!e.is('.form-row')) {
        e = e.parents('.form-row');
    }

    var fieldset = e.parents('fieldset');
     
    return get_fieldset_name(fieldset);
}

{% if admin_hack_form %}

function enable_sortable() {
    $('fieldset:not(.inline-related fieldset):visible').sortable({
        connectWith: 'fieldset',
        forcePlaceholderSize: true,
        placeholder: 'ui-state-highlight',
        items: '.form-row',
        stop: function(e, ui) {
            $tabs.find('li').removeClass('switch-on-hover');
        },
        start: function(e, ui) {
            $tabs.find('li').addClass('switch-on-hover');
        },
    });
}

function save(callback) {
    $.post(
        '{% url 'admin_hack_forms_update' %}', {
            'forms': $.toJSON(forms),
        }, function(data, textStatus, jqXHR) {
            forms = data;

            for (var i = 0; i < data.length; i++) {
                if (!$select.find('option[value='+data[i].pk+']').length) {
                    $select.append('<option value="'+data[i].pk+'">'+data[i].name+'</option>');
                }

                if (data[i].name == currentForm.name) {
                    currentForm = data[i];
                    $select.val(data[i].pk);
                    $select.trigger('change');
                    break;
                }
            }

            if (callback) {
                callback();
            }
        }, 'json'
    );
}

function deleteForm() {
    if (currentForm.name == 'full') {
        alert("{% trans "You may not remove the 'full' form. It serves as reference." %}");
        return;
    }

    var confirmed = confirm('{% trans "Are you sure you want to this form model" %} "' + currentForm.name + '" ? {% trans "There is no going back once you push the confirmation button" %}');

    if (confirmed) {
        $select.find('option[value='+currentForm.pk+']').remove();
        var full;
        for(var i=0; i < forms.length; i++) {
            if (forms[i].name == 'full') {
                full = forms[i];
            }

            if (forms[i].pk == currentForm.pk) {
                forms.splice(i, 1);
            }
        }

        save();
        currentForm = full;
        $select.val(full.pk);
        $select.trigger('change');
    }
}

function createForm(name) {
    var field_set;

    // prompt for a name if necessarry
    if (!name) name = prompt('{% trans "How should we name the new form ?" %}');
    // abort if no name for the form
    if (!name) return

    // select the full form to be used as template for the new form
    for (var i=0; i<forms.length; i++) {
        if (forms[i].name == 'full') {
            field_set = forms[i].field_set.slice();
            break;
        }
    }
    if (!field_set) {
        field_set = getFieldSet();
    }

    // create a new form array
    currentForm = {
        name: name,
        contenttype: {
            pk: {{ contenttype.pk }},
        },
        field_set: field_set,
    };

    // register the new form
    forms.push(currentForm)
    // upload changes
    save()
}

function getFieldSet() {
    var new_field_set = [];
    var order = 0;
    var cv = this;

    var names = [];
    $('fieldset .form-row').each(function() {
        if ($(this).hasClass('admin_hack_hidden')) {
            return
        }

        var name = get_field_name($(this));
        if (name == 'admin_hack_form') {
            return
        }

        var fieldset = get_field_fieldset($(this));
        var field = {
            name: name,
            order: order,
            fieldset: fieldset,
        }

        var row = $('.form-row.'+slugify(name));
        if (row.find('.customvalue_extra').length) {
            var select = false;
            row.find('select').each(function() {
                if ($(this).attr('name').match(customvalue_kind_re)) {
                    select = $(this);
                }
            });
            field.kind = select.val();

            var input = false;
            row.find('input').each(function() {
                if ($(this).attr('name').match(customvalue_name_re)) {
                    input = $(this);
                }
            });
            field.name = input.val();
        }

        new_field_set.push(field)
        names.push(name);

        order = order +1;
    });

    // console.log('fields', names);

    return new_field_set
}

function updateUi() {
    // hide stuff that should not be there when full is selected
    currentForm.name == 'full' ? $('.hide_on_full').hide() : $('.hide_on_full').show();

    /* let's re-order some fields yay */
    var previous, e;
    for(var i=0; i < currentForm.field_set.length; i++) {
        var field = currentForm.field_set[i];

        e = get_field_container(field.name);
        if (e == undefined || !e.length) {
            console.log(field);
            continue;
        }

        var fieldset;
        if (field.fieldset) {
            $('fieldset').each(function() {
                var name = get_fieldset_name($(this));
                if (name == field.fieldset) {
                    fieldset = $(this);
                }
            });
        }

        if (i > 0 && fieldset && field.fieldset != currentForm.field_set[i-1].fieldset) {
            $(e).insertAfter(get_fieldset_h2(fieldset));
        } else if (previous) {
            $(e).insertAfter(previous);
        } else {
            $(e).insertAfter('.form-row.admin_hack_form');
        }

        previous = e;
    }

    /* let's hide un-necessary fields */
    $('.form-row').each(function() {
        var name = get_field_name($(this));
        if (name == 'admin_hack_form') return

        var found = false;
        for (i=0; i < currentForm.field_set.length; i++) {
            if (name == currentForm.field_set[i].name) {
                found = true;
                break;
            }
        }

        if (found) {
            $(this).removeClass('admin_hack_hidden');
        } else {
            $(this).addClass('admin_hack_hidden');
        }
    });

    $('fieldset.module').each(function() {
        // pass on inline related
        if ($(this).parent().hasClass('inline-related')) return

        var name = get_fieldset_name($(this));

        if (!name) return;

        var tab;
        $tabs.find('li a').each(function() {
            if ($(this).html() == name) {
                tab = $(this).parent();
            }
        });
        // if all rows are hidden then hide the tab
        // console.log($(this).find('h2').html(), $(this).hasClass('collapsed'), $(this).is(':visible'));
        if ($(this).find('.form-row:not(.admin_hack_hidden)').length == 0 && !$(this).is('inline-related')) {
            tab.addClass('admin_hack_hidden');
        } else {
            tab.removeClass('admin_hack_hidden');
        }
    });

    // hide show mode if no field is hidden
    if (currentForm.name != 'full' )
        $('.admin_hack_hidden').length == 0 ? $('#admin_hack_mode_show').parent().hide() : $('#admin_hack_mode_show').parent().show();
}

function updateCustomValues() {
    var $custom_values_tab = $('fieldset.custom-values_tab');
    $('.custom-values_tab tr').each(function() {
        if (!$.trim($(this).find('td.name input').val())) {
            return;
        }
        
        var label = $(this).find('td.name input').val();
        var slug = slugify($.trim($(this).find('td.name input').val()));
        var kind = $(this).find('td.kind select').val();
        var $value = $(this).find('td.value span.'+kind);
        var value_id = 'id_' + slug;
        $value.attr('id', value_id);

        html = ['<div class="form-row '+slug+'"><div>'];
        html.push('<label for="'+value_id+'">');
        html.push(label);
        html.push(':</label>');
        html.push('<div style="display:none" class="customvalue_extra"></div>');
        html.push('</div></div>');

        $custom_values_tab.find('h2').after(html.join(''));

        var $row = $('div.form-row.'+slug);
        $row.find('label').after($value);
        $(this).find('input, select').appendTo($row.find('.customvalue_extra'));
        $(this).remove();
    });
    $custom_values_tab.find('.form-row').appendTo('fieldset:first');

}

function main() {
    // clean options
    $select.find('option').each(function() {
        if ($.inArray(parseInt($(this).attr('value')), {{ forms_pk_json }}) == -1) {
            $(this).remove();
        }
        if (!$(this).attr('value').length) {
            $(this).remove();
        }
    });

    // create the full form if it doesn't exist
    if ($select.find('option').length == 0) {
        form = createForm('full');
        $select.find('option').attr('selected', 'selected');
    } else {
         for (var i=0; i<forms.length; i++) {
            if (forms[i].name == 'full') {
                if (forms[i].field_set.length == 0) {
                    forms[i].field_set = getFieldSet();
                    save()
                }
            }
         }
    }
    // if the full form has no field then regenerate it
    if ($select.find('option').length == 0) {
        form = createForm('full');
        $select.find('option').attr('selected', 'selected');
    }

    // bind change to update the ui
    $select.change(function() {
        // find the form
        for (var i=0; i<forms.length; i++) {
            if (forms[i].pk == $(this).val()) {
                currentForm = forms[i];
                // update the ui
                updateUi();
                break;
            }
        }
    });

    // ensure an option is selected
    if (!$select.find('option:selected')) {
        $select.find('option:first').attr('selected', 'selected');
    }
    // trigger a change to update ui
    $select.trigger('change');
}

function show_save_form(pending_record_changes) {
    function update_submit_row_with_pending_record_changes() {
        update_submit_row(true);
    }
    function update_submit_row_without_pending_record_changes() {
        update_submit_row(false);
    }

    var update_submit_row = function(pending_record_changes) {
        // remove form save button
        $('#content-main .submit-row .admin_hack_save').remove();

        // put a loading text
        if (!$('#content-main .submit-row .admin_hack_loading').length) {
            $('#content-main .submit-row').append(
                '<p class="admin_hack_loading">{% trans 'Saving form changes ... '%}</p>');
        }

        // if not saved run me again later
        if ($('#admin_hack .enabled').length) {
            if (pending_record_changes)
                setTimeout(update_submit_row_with_pending_record_changes, 1000);
            else
                setTimeout(update_submit_row_without_pending_record_changes, 1000);
            return
        }

         $('#content-main .submit-row .admin_hack_loading').remove();

        // hide bar if no pending record changes
        if (! pending_record_changes) {
            $('#content-main .submit-row').hide();
        }

        // show record save buttons
        $('#content-main .submit-row input[type=submit]').show();
    }

    // hide record save buttons
    $('#content-main .submit-row input[type=submit]').hide();

    // add form save button
    var button = admin_hack_html_tag_factory('span', {
        'class': 'btn success admin_hack_save',
        'title': "{% trans 'Save the current form configuration' %}",
    }, "{% trans 'Save form configuration' %}");
    $('#content-main .submit-row').append(button);
    
    // show submit row
    $('#content-main .submit-row').show();

    // bind save form widget to update submit row
    $('#admin_hack .enabled').one('click', function() {
        update_submit_row(pending_record_changes);
    });

    // bind form save button to disable the mode
    $('#content-main .submit-row .admin_hack_save').click(function() {
        // disable mode
        $('#admin_hack .enabled').click();
    }); 
}
{% endif %}{# endif of: if admin_hack_form #}

var $tabs {% if admin_hack_form %}, $select, currentForm, forms{% endif %};
$(document).ready(function() {
    // make jQuery compatible with django
    $.ajaxSettings.traditional = true;

    // create the tab list after the first fieldset
    $('fieldset:first').after('<ul class="tabs" id="fieldset_tabs"></ul>');
    $tabs = $('#fieldset_tabs');

    // are there enought fieldsets to make tabs ?
    if ($('fieldset').length < 2) {
        $tabs.hide();
    } else {
        // generate the tab list
        $('fieldset, .inline-group').each(function() {
            // pass on stacked inlines
            if ($(this).is('.inline-related:not(.tabular) fieldset'))
                return
            if ($(this).is('.inline-group')) {
                if ($(this).find('.tabular').length) return
                $(this).addClass('stacked');
            }

            var name = get_fieldset_name($(this));
            var slug = slugify(name || '');
            var error = $(this).find('.errorlist').length > 0;
            $(this).addClass(slug + '_tab');

            var cls = slug + '_tab';
            if (error) cls = cls + ' error';

            if (!name)
                $(this).addClass('always_active');
            else
                $tabs.append('<li class="'+cls+'"><a href="javascript:;">'+name+'</a></li>');
        });

        $tabs.find('li').click(function() {
            // what is the fieldset name
            var name = $(this).find('a').html();
            
            // what is the fieldset element
            var fieldset;
            $('fieldset, .stacked').each(function() {
                if (name != get_fieldset_name($(this))) return
                fieldset = $(this);
            });

            // is the user trying to open a tab that is already open ?
            if (fieldset.hasClass('active')) return

            // deactivate the active fieldset
            $('.active').removeClass('active');
            // activate the related fieldset
            fieldset.addClass('active');
            $(this).addClass('active');

            if ($('#admin_hack_mode_move').hasClass('enabled')) {
                // re enable sortable
                $('fieldset').sortable('destroy');
                enable_sortable();
            }
        });
        if ($tabs.find('li.error').length)
            $tabs.find('li.error:first').click();
        else
            $tabs.find('li:first').click();
    }

    /* This should work but for some reason it doesn't
    $('li, .switch-on-hover, .switch-on-hover a').live('mouseover', function() {
        var li = $(this);
        $(this).data('timeout', setTimeout(function() {
            console.log('timeoutfunccall');
            li.find('a').click();
        }, 2000));
        console.log('setTimeout', $(this).data('timeout'))
    });
    $('li, .switch-on-hover').live('mouseout', function() {
        clearTimeout($(this).data('timeout'));
        console.log('cleartimeout');
    });
    */

    {% if admin_hack_form %}
    $(document).keyup(function(e) {
        if (e.keyCode == 13) {
            $('#admin_hack_create_field_continue:visible').click();
        }
        if (e.keyCode == 27) {
            $('#admin_hack_create_field_cancel:visible').click();
        }
    });

    $('body').append('<div id="admin_hack_modal" class="white_content"></div>');
    $('body').append('<div id="admin_hack_overlay" class="black_overlay"></div>');
    $('#admin_hack_modal').append($('#admin_hack_create_field_template').html());
    $('#admin_hack_create_field_template').remove();
    $('#admin_hack_create_field_continue').click(function() {
        if (!$.trim($('input[name=admin_hack_create_field_name]').val())) {
            alert('{% trans 'Please set the name of the field you want to add' %}');
            return;
        }
        $('#admin_hack_modal, #admin_hack_overlay').hide();
        var label = $('input[name=admin_hack_create_field_name]').val();
        var slug = slugify(label);
        var kind = $('select[name=admin_hack_create_field_kind]').val();
        
        $('fieldset.custom-values_tab .add-row a').click();
        var $tr = $('fieldset.custom-values_tab tr.dynamic-customvalue_set:last');
        $tr.find('td.name input').val(label);
        $tr.find('td.kind select').val(kind);
        $tr.find('td.kind select').change();
        $tr.find('td.name .slug').html(slug);
        updateCustomValues();
        // parse current form fieldset
        currentForm.field_set = getFieldSet();
        save();
    });
    $('#admin_hack_create_field_cancel').click(function() {
        $('#admin_hack_modal, #admin_hack_overlay').hide();
    });
    $('#admin_hack_create_field').click(function() {
        $('#admin_hack_modal, #admin_hack_overlay').show();
    });

    updateCustomValues();

    $select = $('select#id_admin_hack_form');

    // bin the reset button to delete and re-create the current form
    $('#admin_hack_reset').click(function() {
        var name = currentForm.name;
        deleteForm();
        createForm(name);
    });

    // bind create button to createForm
    $('#admin_hack_create').click(function() {
        createForm()
    });
    
    // bind delete button to deleteForm
    $('#admin_hack_delete').click(function() {
        deleteForm()
    });
 
    // bind hide button to add .admin_hack_hidden to parent form row and remove
    // itself on click
    $('.admin_hack_mode_hide').live('click', function() {
        $(this).parents('.form-row').addClass('admin_hack_hidden');
        $(this).remove();
    });
    // bind the hide mode toggler button
    $('#admin_hack_mode_hide').click(function() {
        if ($(this).data('saving')) return

        if ($(this).hasClass('enabled')) {
            // remove hide buttons - not needed anymore
            $('.admin_hack_mode_hide').remove();

            // parse current form fieldset
            currentForm.field_set = getFieldSet();

            $(this).html('{% trans "Saving your changes ..." %}'
                ).data('saving', 1);
            
            // upload changes
            save(function() {
                // set mode as disabled and update label
                $('#admin_hack_mode_hide').removeClass('enabled').html(
                    "{% trans 'Remove fields' %}").data('saving', 0);
                
                // show other modes
                $('.admin_hack_mode:not(:visible)').slideDown();
            });
        } else {
            // create the hide button html
            var button = admin_hack_html_tag_factory('span', {
                'class': 'btn danger admin_hack_mode_hide',
                'title': "{% trans 'Hide this field' %}",
            }, "{% trans 'Remove' %}");

            // add the hide button to all fields *except* required and admin_hack_form
            $('#content-main label').each(function() {
                if ($(this).hasClass('required')) return
                if ($(this).parents('.inline-group').length) return
                if (get_field_name($(this)) == 'admin_hack_form') return

                // append the button once per form row
                if (! $(this).parents('.form-row').find('.admin_hack_mode_hide').length) 
                    $(this).append(button);
            });

            // set mode enabled and label
            $(this).addClass('enabled').html(
                "{% trans 'Save your changes' %}");
            
            // hide other modes
            $('.admin_hack_mode:not(.enabled)').slideUp();

            show_save_form($('#content-main .submit-row:visible').length > 0);
        }
    });

    // bind show button to add .admin_hack_hidden to parent form row and remove
    // itself on click
    $('.admin_hack_mode_show').live('click', function() {
        $(this).remove();
    });
    // bind the show mode toggler button
    $('#admin_hack_mode_show').click(function() {
        if ($(this).data('saving')) return

        if ($(this).hasClass('enabled')) {
            // add hidden class to all leftover buttons form-row and remove buttons
            $('.admin_hack_mode_show').each(function() {
                $(this).parents('.form-row').addClass('admin_hack_hidden');
                $(this).remove();
            });

            // parse current form fieldset
            currentForm.field_set = getFieldSet();

            $(this).html('{% trans "Saving your changes ..." %}'
                ).data('saving', 1);

            // upload changes
            save(function() {
                // set mode as disabled and update label
                $('#admin_hack_mode_show').removeClass('enabled').html(
                    "{% trans 'Un-remove fields' %}").data('saving', 0);
                
                // show other modes
                $('.admin_hack_mode:not(:visible)').slideDown();
            });
        } else {
            // create the show button html
            var button = admin_hack_html_tag_factory('span', {
                'class': 'btn success admin_hack_mode_show',
                'title': "{% trans 'Keep this field visible in current form configuration' %}",
            }, "{% trans 'Keep' %}");

            // add the show button to all fields *except* required and admin_hack_form
            $('.admin_hack_hidden').each(function() {
                // remove the hidden class
                $(this).removeClass('admin_hack_hidden');

                // append the button once per form row
                if (! $(this).find('.admin_hack_mode_show').length) 
                    $(this).find('label:first').append(button);
            });

            // set mode enabled and label
            $(this).addClass('enabled').html(
                "{% trans 'Save your changes' %}");
            
            // hide other modes
            $('.admin_hack_mode:not(.enabled)').slideUp();
            
            show_save_form($('#content-main .submit-row:visible').length > 0);
        }
    });

    // bind the order mode toggler button
    $('#admin_hack_mode_move').click(function() {
        if ($(this).data('saving')) return

        if ($(this).hasClass('enabled')) {
            $('.form-row, .form-row *').removeClass('draggable');

            // destroy sortable
            $('fieldset').sortable('destroy');

            // parse current form fieldset
            currentForm.field_set = getFieldSet();
            
            $(this).html('{% trans "Saving your changes ..." %}'
                ).data('saving', 1);
            
            // upload changes
            save(function() {
                // set mode as disabled and update label
                $('#admin_hack_mode_move').removeClass('enabled').html(
                    "{% trans 'Move fields' %}").data('saving', 0);
                
                // show other modes
                $('.admin_hack_mode:not(:visible)').slideDown();
            });            
        } else {
            $('.form-row').addClass('draggable');

            // make sortable
            enable_sortable();

            // set mode enabled and label
            $(this).addClass('enabled').html(
                "{% trans 'Save your changes' %}");
            
            // hide other modes
            $('.admin_hack_mode:not(.enabled)').slideUp();

            show_save_form($('#content-main .submit-row:visible').length > 0);
        }
    });

    forms = {{ forms_dict|as_json }};
    main();
    {% endif %}
});
{% endif %}
