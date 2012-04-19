from django.conf import settings
from django.conf.urls.defaults import *
from django.views import generic
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction

import views

urlpatterns = patterns('',
    url(
        r'^export/$',
        views.ExportView.as_view(),
        name='admin_hack_export',
    ),
    url(
        r'^userprofile/(?P<pk>[0-9]+)/update/$',
        csrf_exempt(views.AdminHackUserProfileUpdateView.as_view()),
        name='admin_hack_user_profile_update',
    ),
    url(
        r'^forms/update/$',
        csrf_exempt(views.AdminHackFormsUpdateView.as_view()),
        name='admin_hack_forms_update',
    ),
    url(
        r'^reset/$',
        csrf_exempt(views.AdminHackFormResetView.as_view()),
        name='admin_hack_form_reset',
    ),
)
