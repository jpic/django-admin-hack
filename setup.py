#!/usr/bin/env python

from setuptools import setup, find_packages

setup(
    name='django-admin-hacks',
    version="0.0",
    author='James Pic',
    author_email='jamespic@gmail.com',
    description='Make django-admin-tools more customisable',
    url='http://github.com/jpic/django-admin-hacks',
    packages=find_packages(),
    include_package_data=True,
    classifiers=[
        "Framework :: Django",
        "Intended Audience :: Developers",
        "Operating System :: OS Independent",
        "Topic :: Software Development"
    ],
    requires=[
        'django_mptt (==0.5)',
        'django_admin_tools (==0.4.0)',
        'django_annoying',
        'django_autoslug',
    ]
)
