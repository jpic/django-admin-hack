#!/usr/bin/env python

from setuptools import setup, find_packages

setup(
    name='django-admin-tools-plus',
    version="0.0",
    author='James Pic',
    author_email='jamespic@gmail.com',
    description='Manage menus and fieldsets throught the admin',
    url='http://github.com/jpic/django-admin-tools-plus',
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
    ]
)
