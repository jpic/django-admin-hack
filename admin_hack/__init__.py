from django.conf import settings

def patch_admin(site, admin_hack_prefix='/admin_hack/'):
    for model, options in site._registry.items():
        # smelly code, obfuscation over metaclass FTW
        media = options.media
        media.add_js(['%sjs/' % admin_hack_prefix])
        media.add_css({
            'all': [settings.STATIC_URL + '/admin_hack/style.css']
        })
        options.__class__.media = media
