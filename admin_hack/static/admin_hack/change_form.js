AdminHack.enable_sortable = function() {
    $('fieldset:not(.inline-related fieldset):visible').sortable({
        connectWith: 'fieldset',
        forcePlaceholderSize: true,
        placeholder: 'ui-state-highlight',
        items: '.form-row:not(.admin_hack_form)',
        stop: function(e, ui) {
            AdminHack.tabs.find('li').removeClass('switch-on-hover');
        },
        start: function(e, ui) {
            AdminHack.tabs.find('li').addClass('switch-on-hover');
        },
    });
}

AdminHack.save = function(callback) {
    $.post(
        AdminHack.urls.admin_hack_forms_update, {
            'forms': $.toJSON(AdminHack.forms),
        }, function(data, textStatus, jqXHR) {
            AdminHack.forms = data;

            for (var i = 0; i < data.length; i++) {
                if (!AdminHack.form_select.find('option[value='+data[i].pk+']').length) {
                    AdminHack.form_select.append('<option value="'+data[i].pk+'">'+data[i].name+'</option>');
                }

                if (data[i].name == AdminHack.currentForm.name) {
                    AdminHack.currentForm = data[i];
                    AdminHack.form_select.val(data[i].pk);
                    AdminHack.form_select.trigger('change');
                    break;
                }
            }

            if (callback) {
                callback();
            }
        }, 'json'
    );
}

AdminHack.deleteForm = function() {
    if (AdminHack.currentForm.name == 'full') {
        alert(AdminHack.messages.full_protected);
        return;
    }

    var confirmed = confirm(AdminHack.messages.confirm_form_delete + ' ' + AdminHack.currentForm.name + '" ? ' + AdminHack.messages.no_going_back);

    if (confirmed) {
        AdminHack.form_select.find('option[value='+AdminHack.currentForm.pk+']').remove();
        var full;
        for(var i=0; i < AdminHack.forms.length; i++) {
            if (AdminHack.forms[i].name == 'full') {
                full = AdminHack.forms[i];
            }

            if (AdminHack.forms[i].pk == AdminHack.currentForm.pk) {
                AdminHack.forms.splice(i, 1);
            }
        }

        AdminHack.save();
        AdminHack.currentForm = full;
        AdminHack.form_select.val(full.pk);
        AdminHack.form_select.trigger('change');
    }
}

AdminHack.resetForm = function() {
    $.post(AdminHack.urls.admin_hack_form_reset, {
            name: AdminHack.currentForm.name, 
            ctype: AdminHack.currentForm.contenttype.pk, 
        }, 
        function() {
            window.location.reload()
        }
    );
}

AdminHack.createForm = function(name) {
    var field_set;

    // prompt for a name if necessarry
    if (!name) name = prompt(AdminHack.messages.new_form_name);
    // abort if no name for the form
    if (!name) return

    // select the full form to be used as template for the new form
    for (var i=0; i<AdminHack.forms.length; i++) {
        if (AdminHack.forms[i].name == 'full') {
            field_set = AdminHack.forms[i].field_set.slice();
            break;
        }
    }
    if (!field_set) {
        field_set = AdminHack.getFieldSet();
    }

    // create a new form array
    AdminHack.currentForm = {
        name: name,
        contenttype: {
            pk: AdminHack.contenttype_pk,
        },
        field_set: field_set,
    };

    // register the new form
    AdminHack.forms.push(AdminHack.currentForm)
    // upload changes
    AdminHack.save()
}

AdminHack.getFieldSet = function() {
    var new_field_set = [];
    var order = 0;
    var cv = this;

    var names = [];
    $('fieldset .form-row').each(function() {
        if ($(this).parents('.stacked').length) {
            return
        }

        if ($(this).hasClass('admin_hack_hidden')) {
            return
        }

        var name = AdminHack.get_field_name($(this));
        if (name == 'admin_hack_form') {
            return
        }

        var fieldset = AdminHack.get_field_fieldset($(this));
        var field = {
            name: name,
            order: order,
            fieldset: fieldset,
        }

        var row = $('.form-row.'+AdminHack.slugify(name));
        if (AdminHack.currentForm && AdminHack.currentForm.name != 'full' && row.find('.customvalue_extra').length) {
            var select = false;
            row.find('select').each(function() {
                if ($(this).attr('name').match(AdminHack.regexps.customvalue_kind)) {
                    select = $(this);
                }
            });
            field.kind = select.val();

            var input = false;
            row.find('input').each(function() {
                if ($(this).attr('name').match(AdminHack.regexps.customvalue_name)) {
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

AdminHack.updateUi = function() {
    // hide stuff that should not be there when full is selected
    AdminHack.currentForm.name == 'full' ? $('.hide_on_full').hide() : $('.hide_on_full').show();

    // fill custom values
    for(var i=0; i < AdminHack.currentForm.field_set.length; i++) {
        var field = AdminHack.currentForm.field_set[i];

        e = AdminHack.get_field_container(field.name);
        if (e == undefined || !e.length) {
            var found = false;
            $('fieldset.custom-values_tab table tr:not(.add-row):not(.empty-form)').each(function() {
                if ($(this).find('tr.name input').val() == field.name) {
                    found = true;
                }
            });

            if (found) {
                continue
            }

            $('fieldset.custom-values_tab .add-row a').click();
            var row = $('fieldset.custom-values_tab tr:not(.add-row):not(.empty-form):last');
            row.find('td.name input').val(field.name);
            row.find('td.kind select').val(field.kind);
            row.find('td.kind select').trigger('change');
        }
    }
    AdminHack.updateCustomValues();

    /* let's re-order some fields yay */
    var previous, e;
    for(var i=0; i < AdminHack.currentForm.field_set.length; i++) {
        var field = AdminHack.currentForm.field_set[i];

        e = AdminHack.get_field_container(field.name);
        if (e == undefined || !e.length) {
            continue;
        }

        var fieldset;
        if (field.fieldset) {
            $('fieldset').each(function() {
                var name = AdminHack.get_fieldset_name($(this));
                if (name == field.fieldset) {
                    fieldset = $(this);
                }
            });
        }

        if (i > 0 && fieldset && field.fieldset != AdminHack.currentForm.field_set[i-1].fieldset) {
            $(e).insertAfter(AdminHack.get_fieldset_h2(fieldset));
        } else if (previous) {
            $(e).insertAfter(previous);
        } else {
            $(e).insertAfter('.form-row.admin_hack_form');
        }

        previous = e;
    }

    /* let's hide un-necessary fields */
    $('.form-row:not(.stacked .form-row)').each(function() {
        var name = AdminHack.get_field_name($(this));
        if (name == 'admin_hack_form') return

        var found = false;
        for (i=0; i < AdminHack.currentForm.field_set.length; i++) {
            if (name == AdminHack.currentForm.field_set[i].name) {
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

        var name = AdminHack.get_fieldset_name($(this));

        if (!name) return;

        var tab;
        AdminHack.tabs.find('li a').each(function() {
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
    if (AdminHack.currentForm.name != 'full' )
        $('.admin_hack_hidden').length == 0 ? $('#admin_hack_mode_show').parent().hide() : $('#admin_hack_mode_show').parent().show();
}

AdminHack.updateCustomValues = function() {
    var $custom_values_tab = $('fieldset.custom-values_tab');
    $('.custom-values_tab tr:not(.empty-form)').each(function() {
        var label = $.trim($(this).find('td.name input').val());

        if (!label) {
            return;
        }
        
        var slug = AdminHack.slugify($.trim($(this).find('td.name input').val()));
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

AdminHack.change_form_main = function() {
    // clean options
    AdminHack.form_select.find('option').each(function() {
        if ($.inArray(parseInt($(this).attr('value')), AdminHack.forms_pks) == -1) {
            $(this).remove();
        }
        if (!$(this).attr('value').length) {
            $(this).remove();
        }
    });

    // create the full form if it doesn't exist
    if (AdminHack.form_select.find('option').length == 0) {
        form = AdminHack.createForm('full');
        AdminHack.form_select.find('option').attr('selected', 'selected');
    } else {
         for (var i=0; i<AdminHack.forms.length; i++) {
            if (AdminHack.forms[i].name == 'full') {
                if (AdminHack.forms[i].field_set.length == 0) {
                    AdminHack.forms[i].field_set = AdminHack.getFieldSet();
                    AdminHack.save()
                }
            }
         }
    }
    // if the full form has no field then regenerate it
    if (AdminHack.form_select.find('option').length == 0) {
        form = AdminHack.createForm('full');
        AdminHack.form_select.find('option').attr('selected', 'selected');
    }

    // bind change to update the ui
    AdminHack.form_select.change(function() {
        // find the form
        for (var i=0; i<AdminHack.forms.length; i++) {
            if (AdminHack.forms[i].pk == $(this).val()) {
                AdminHack.currentForm = AdminHack.forms[i];
                // update the ui
                AdminHack.updateUi();
                break;
            }
        }
    });

    // ensure an option is selected
    if (!AdminHack.form_select.find('option:selected')) {
        AdminHack.form_select.find('option:first').attr('selected', 'selected');
    }
    // trigger a change to update ui
    AdminHack.form_select.trigger('change');
}

AdminHack.show_save_form = function(pending_record_changes) {
    update_submit_row_with_pending_record_changes = function() {
        update_submit_row(true);
    }
    update_submit_row_without_pending_record_changes = function() {
        update_submit_row(false);
    }

    var update_submit_row = function(pending_record_changes) {
        // remove form save button
        $('#content-main .submit-row .admin_hack_save').remove();

        // put a loading text
        if (!$('#content-main .submit-row .admin_hack_loading').length) {
            $('#content-main .submit-row').append(
                '<p class="admin_hack_loading">' + AdminHack.messages.saving + '</p>');
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
    var button = AdminHack.html_tag_factory('span', {
        'class': 'btn success admin_hack_save',
        'title': AdminHack.messages.save,
    }, AdminHack.messages.save);
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

$(document).ready(function() {
    AdminHack.form_select = $('select#id_admin_hack_form').length ? $('select#id_admin_hack_form') : false;

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

    if (AdminHack.form_select) {
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
                alert(AdminHack.messages.new_field_name);
                return;
            }
            $('#admin_hack_modal, #admin_hack_overlay').hide();
            var label = $('input[name=admin_hack_create_field_name]').val();
            var slug = AdminHack.slugify(label);
            var kind = $('select[name=admin_hack_create_field_kind]').val();
            
            if (!$('fieldset.custom-values_tab .add-row a').length) {
                alert('DEBUG: no custom values tab, cannot add field');
            }
            $('fieldset.custom-values_tab .add-row a').click();
            var $tr = $('fieldset.custom-values_tab tr.dynamic-customvalue_set:last');
            $tr.find('td.name input').val(label);
            $tr.find('td.kind select').val(kind);
            $tr.find('td.kind select').change();
            $tr.find('td.name .slug').html(slug);
            AdminHack.updateCustomValues();
            // parse current form fieldset
            AdminHack.currentForm.field_set = AdminHack.getFieldSet();
            AdminHack.save();
        });
        $('#admin_hack_create_field_cancel').click(function() {
            $('#admin_hack_modal, #admin_hack_overlay').hide();
        });
        $('#admin_hack_create_field').click(function() {
            $('#admin_hack_modal, #admin_hack_overlay').show();
        });

        AdminHack.updateCustomValues();


        // bin the reset button to delete and re-create the current form
        $('#admin_hack_reset').click(function() {
            var confirmed = confirm(AdminHack.messages.confirm_form_reset + ' ' + AdminHack.currentForm.name + '" ? ' + AdminHack.messages.no_going_back);
            if (confirmed) {
                AdminHack.resetForm()
            }
        });

        // bind create button to AdminHack.createForm
        $('#admin_hack_create').click(function() {
            AdminHack.createForm()
        });
        
        // bind delete button to AdminHack.deleteForm
        $('#admin_hack_delete').click(function() {
            AdminHack.deleteForm()
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
                AdminHack.currentForm.field_set = AdminHack.getFieldSet();

                $(this).html(AdminHack.messages.saving).data('saving', 1);
                
                // upload changes
                AdminHack.save(function() {
                    // set mode as disabled and update label
                    $('#admin_hack_mode_hide').removeClass('enabled').html(
                        AdminHack.messages.remove_fields).data('saving', 0);
                    
                    // show other modes
                    $('.admin_hack_mode:not(:visible)').slideDown();
                });
            } else {
                // create the hide button html
                var button = AdminHack.html_tag_factory('span', {
                    'class': 'btn danger admin_hack_mode_hide',
                    'title': AdminHack.messages.hide_field,
                }, AdminHack.messages.remove);

                // add the hide button to all fields *except* required and admin_hack_form
                $('#content-main label').each(function() {
                    if ($(this).hasClass('required')) return
                    if ($(this).parents('.inline-group').length) return
                    if (AdminHack.get_field_name($(this)) == 'admin_hack_form') return

                    // append the button once per form row
                    if (! $(this).parents('.form-row').find('.admin_hack_mode_hide').length) 
                        $(this).append(button);
                });

                // set mode enabled and label
                $(this).addClass('enabled').html(AdminHack.messages.save);
                
                // hide other modes
                $('.admin_hack_mode:not(.enabled)').slideUp();

                AdminHack.show_save_form($('#content-main .submit-row:visible').length > 0);
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
                AdminHack.currentForm.field_set = AdminHack.getFieldSet();

                $(this).html(AdminHack.messages.saving).data('saving', 1);

                // upload changes
                AdminHack.save(function() {
                    // set mode as disabled and update label
                    $('#admin_hack_mode_show').removeClass('enabled').html(
                        AdminHack.messages.unremove_fields).data('saving', 0);
                    
                    // show other modes
                    $('.admin_hack_mode:not(:visible)').slideDown();
                });
            } else {
                // create the show button html
                var button = AdminHack.html_tag_factory('span', {
                    'class': 'btn success admin_hack_mode_show',
                    'title': AdminHack.messages.unremove_help,
                }, AdminHack.messages.unremove);

                // add the show button to all fields *except* required and admin_hack_form
                $('.admin_hack_hidden').each(function() {
                    // remove the hidden class
                    $(this).removeClass('admin_hack_hidden');

                    // append the button once per form row
                    if (! $(this).find('.admin_hack_mode_show').length) 
                        $(this).find('label:first').append(button);
                });

                // set mode enabled and label
                $(this).addClass('enabled').html(AdminHack.messages.save);
                
                // hide other modes
                $('.admin_hack_mode:not(.enabled)').slideUp();
                
                AdminHack.show_save_form($('#content-main .submit-row:visible').length > 0);
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
                AdminHack.currentForm.field_set = AdminHack.getFieldSet();
                
                $(this).html(AdminHack.messages.saving).data('saving', 1);
                
                // upload changes
                AdminHack.save(function() {
                    // set mode as disabled and update label
                    $('#admin_hack_mode_move').removeClass('enabled').html(
                        AdminHack.messages.move_fields).data('saving', 0);
                    
                    // show other modes
                    $('.admin_hack_mode:not(:visible)').slideDown();
                });            
            } else {
                $('.form-row').addClass('draggable');

                // make sortable
                AdminHack.enable_sortable();

                // set mode enabled and label
                $(this).addClass('enabled').html(AdminHack.messages.save);
                
                // hide other modes
                $('.admin_hack_mode:not(.enabled)').slideUp();

                AdminHack.show_save_form($('#content-main .submit-row:visible').length > 0);
            }
        });

        $(document).click(function(e) { 
            if ($(e.srcElement).is('#toggle_links')) {
                return;
            }
            if ($('.admin_hack_toggle:visible').length && $(e.srcElement).is('.admin_hack_toggle') == false && $('.admin_hack_toggle').find(e.srcElement).length == 0) {
                $('.admin_hack_toggle:visible').hide();
            }
        });

        AdminHack.change_form_main();

        $(document).trigger('AdminHack.ready');
    }
});
