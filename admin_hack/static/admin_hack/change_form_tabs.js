// we want tabs anyway
$(document).ready(function() {
    // are there enought fieldsets to make tabs ?
    if ($('fieldset').length > 1) {
        // create the tab list after the first fieldset
        $('fieldset:first').after('<ul class="tabs" id="fieldset_tabs"></ul>');
        AdminHack.tabs = $('#fieldset_tabs');

        // generate the tab list
        $('fieldset, .inline-group').each(function() {
            // pass on stacked inlines
            if ($(this).is('.inline-related:not(.tabular) fieldset'))
                return
            if ($(this).is('.inline-group')) {
                if ($(this).find('.tabular').length) return
                $(this).addClass('stacked');
            }

            var name = AdminHack.get_fieldset_name($(this));
            var slug = AdminHack.slugify(name || '');
            var error = $(this).find('.errorlist').length > 0;
            $(this).addClass(slug + '_tab');

            var cls = slug + '_tab';
            if (error) cls = cls + ' error';

            if (!name)
                $(this).addClass('always_active');
            else
                AdminHack.tabs.append('<li class="'+cls+'"><a href="javascript:;">'+name+'</a></li>');
        });

        AdminHack.tabs.find('li').click(function() {
            // what is the fieldset name
            var name = $(this).find('a').html();
            
            // what is the fieldset element
            var fieldset = get_fieldset_for_tab($(this));

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
                AdminHack.enable_sortable();
            }

            if ($('#fieldset_tabs').hasClass('accordeon')) {
                updateAccordeon();
            }
        });

        if ($.cookie != undefined) {
            // if path is /admin/art/artwork/add/ or /admin/art/artwork/1234/
            // then path should be just /admin/art/artwork
            var path = document.location.pathname.split('/').slice(0, -2).join('/');

            // jquery cookie plugin enabled
            $('input[name=_continue]').click(function() {
                $.cookie(
                    'current_tab', 
                    AdminHack.tabs.find('li.active').attr('class').match(/[a-z-]+_tab/)[0],
                    {
                        path: path, 
                        expires: 1
                    }
                );
            });
            $('input[name=_save], input[name=_addanother], a').click(function() {
                $.cookie('current_tab', null, { expires: -1, path: path });
            });

            var cookie_tab = $.cookie('current_tab');
        }

        $(document).trigger('AdminHack.tabs.before_select');

        if (AdminHack.tabs.find('li.error').length) {
            AdminHack.tabs.find('li.error:first').click();
        } else {
            if (cookie_tab != undefined && cookie_tab && cookie_tab.length) {
                AdminHack.tabs.find('li.' + cookie_tab).click();
            } else {
                AdminHack.tabs.find('li:first').click();
            }
        }
    }

    if ($(window).width() <= 760) updateAccordeon();
    $(window).resize(function() { 
        $(window).width() <= 768 ? updateAccordeon() : updateTabs();
    });
});

function get_fieldset_for_tab(tab) {
    // what is the fieldset name
    var name = tab.find('a').html();

    // what is the fieldset element
    var fieldset;
    $('fieldset, .stacked').each(function() {
        if (name != AdminHack.get_fieldset_name($(this))) return
        fieldset = $(this);
    });

    return fieldset;
}

function updateAccordeon() {
    $('#fieldset_tabs').addClass('accordeon');

    var bottom_tabs = $('#bottom_tabs');
    if (!bottom_tabs.length) {
        var bottom_tabs = $('<ul class="accordeon" id="bottom_tabs"></ul>').insertBefore($('.submit-row'));
    }

    var upper_tabs = $('#fieldset_tabs');
    var foundActive = false;
    $('#fieldset_tabs li, #bottom_tabs li').each(function() {
        if ($(this).hasClass('active')) {
            upper_tabs.append($(this));
            foundActive = true;
        } else if (foundActive) {
            bottom_tabs.append($(this));
        } else {
            upper_tabs.append($(this));
        }
    });
}

function updateTabs() {
    $('#fieldset_tabs').removeClass('accordeon');

    $('#bottom_tabs li').each(function() {
        $('#fieldset_tabs').append($(this));
    });
}
