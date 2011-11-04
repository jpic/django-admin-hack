from django import forms

from models import *

class AdminHackUserProfileForm(forms.ModelForm):
    class Meta:
        model = AdminHackUserProfile
        exclude = ('user',)
