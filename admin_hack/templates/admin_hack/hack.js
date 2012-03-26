{% load url from future %}
{% load i18n %}
{% load admin_hack_tags %}

$(document).ready(function() {
    // are there enought fieldsets to make tabs ?
    if ($('fieldset').length > 1) {
        // create the tab list after the first fieldset
        $('fieldset:first').after('<ul class="tabs" id="fieldset_tabs"></ul>');
        $tabs = $('#fieldset_tabs');

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
            fieldset.parents('.inline-group').addClass('active');
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
