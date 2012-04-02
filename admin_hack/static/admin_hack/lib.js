AdminHack.get_field_name = function(e) {
    if (!e.is('.form-row')) {
        e = e.parents('.form-row');
    }
    
    var custom_name = false;
    e.find('input').each(function() {
        if ($(this).attr('name').match(AdminHack.regexps.customvalue_name)) {
            custom_name = $(this);
        }
    });

    if (custom_name) {
        var name = custom_name.val();
    } else {
        var id = e.find('label').attr('for');
        var name = id.replace(AdminHack.regexps.strip_id, '');

        if (name.match(AdminHack.regexps.is_autocomplete)) {
            if ($('#id_'+ name.replace(AdminHack.regexps.is_autocomplete, '_on_deck')).length) {
                name = name.replace(AdminHack.regexps.is_autocomplete, '');
            }
        }
    }

    return name
}

AdminHack.get_field_container = function(name) {
    if (!name) return false;

    var test = $('.form-row.' + name);
    if (test.length) return test;
    var test = $('.form-row.' + AdminHack.slugify(name));
    if (test.length) return test;
}

AdminHack.get_fieldset_h2 = function(fieldset) {
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

AdminHack.get_fieldset_name = function(fieldset) {
    var fieldset_name = '';
    var fieldset_h2 = AdminHack.get_fieldset_h2(fieldset);
    if (fieldset_h2 != undefined) 
        return $.trim(fieldset_h2.html().match(AdminHack.regexps.fieldset)[0]);
}

AdminHack.get_field_fieldset = function(e) {
    if (!e.is('.form-row')) {
        e = e.parents('.form-row');
    }

    var fieldset = e.parents('fieldset');
     
    return AdminHack.get_fieldset_name(fieldset);
}

AdminHack.slugify = function(text) {
    text = text.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
    text = text.replace(/-/gi, "_");
    text = text.replace(/\s/gi, "-");
    return text.toLowerCase();
}

AdminHack.html_tag_factory = function(tag, attributes, contents) {
    var html = '<' + tag;
    for(var key in attributes) {
        html += ' ' + key + '="' + attributes[key] + '"';
    }   
    html += '>' + contents
    html += '</' + tag + '>';
    return html;
}


