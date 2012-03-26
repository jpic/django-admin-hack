$(document).ready(function() {
    $select = $('select[name=action]');
    $options = $select.find('option');
    $object_tools = $('ul.object-tools');
    $options.each(function() {
        // pass on empty option
        if (!$(this).attr('value')) return;

        var html = ['<li class="action_hack_container"><a class="action_hack value_'];
        html.push($(this).attr('value'));
        html.push('" href="javascript:;" title="')
        html.push($(this).html());
        html.push('">');
        html.push($(this).html());
        html.push('</a></li>');
        $object_tools.append(html.join(''));
    })
});

