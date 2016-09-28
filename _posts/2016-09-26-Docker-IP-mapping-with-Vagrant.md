---
layout: post
title: Mapping Docker container IP with Vagrant machine
---

[Docker](https://docker.com) is a powerful software containerization tool that lets you create multiple self-contained kernel-free containers that share a single virtual machine. It is a very trendy tool that drew attention from lots of companies and developers. Here I'm not going to elaborate on how docker works, so if you are new to Docker, feel free to visit their website, they have maintained a great documentation.

A few days ago, I need to write a script to automatically configure virtual environment and was hoping Docker could be of use. It turned out that it's not trivial work to assign static IP to a docker container.

I'm going to try to write this post in a most simple way such that it could benefit the readers with minimum amount of reading, by defining the **problem** and **solution** explicitly.

## Problem

I needed to access my docker container, which may be serving a website or running an application, from other computers in the same local network (e.g., home, office). Another constraint is that the container has to be accessible at the static local IP address assigned to me.

## Solution


_This solution only applies to OSX users, however, with only minimum tweak, one should be able to easily get it working on Linux and Windows._

1. Download [Docker Toolbox](https://www.docker.com/products/docker-toolbox) and install it. It comes with the following components.

      > * Docker Machine for running docker-machine commands
      > * Docker Engine for running the docker commands
      > * Docker Compose for running the docker-compose commands
      > * Kitematic, the Docker GUI
      > * a shell preconfigured for a Docker command-line environment
      > * Oracle VirtualBox

2. Install [Vagrant](https://www.vagrantup.com/)

3. Open `Docker Quickstart Terminal`. This mini application starts the terminal after creating a linux virtual machine and running some additional configuration code. If you are using `iTerm`, it's likely that `Quickstart Terminal` would not work properly, instead, try run the script [here]({{ site.baseurl }}/public/code/docker_ip_mapping/docker_quickstart.sh).

4. Now, instead of using the default Docker machine created by the Quickstart script, we're going to create our own Docker machine, using Vagrant. To create a Vagrant machine, refer to a sample Vagrantfile below.

        # -*- mode: ruby -*-
        # vi: set ft=ruby :
        # Originally written by Xinyu Chen, modified by Xiaowen Zhang
        Vagrant.configure(2) do |config|

          config.vm.box = "ubuntu/trusty64"

          # Assign a friendly name to this host VM
            config.vm.hostname = "vagrant-docker"

          # Create a private network, which allows host-only access to the machine using a specific IP.
          config.vm.network "private_network", ip: "192.168.33.10"

          # Change the IP address to your assigned one [IMPORTANT].
          config.vm.network "public_network", ip: "192.168.3.25"

          # Adjust number of CPUs and memory allocation here.
          config.vm.provider "virtualbox" do |vb|
            vb.cpus = "4"
            vb.memory = "4096"
            vb.customize ["modifyvm", :id, "--ioapic", "on"]
            vb.customize ["setextradata", :id, "VBoxInternal2/SharedFoldersEnableSymlinksCreate/v-root", "1"]
          end

          # Always use Vagrant's default insecure key
          config.ssh.insert_key = false

        end

5. Now you can run `vagrant up` in the directory the vagrantfile resides. If everything goes well, when you do `vagrant ssh`
, you should be able to see something like below, where the IP address is exactly what we configured.

    ![Vagrant output]({{ site.baseurl }}/public/image/vagrant_output.png)

6. Not only do we need the vm running, we have to tell Docker to use this machine as a Docker vm. Here's how I did it, based on [Scott's Weblog](http://blog.scottlowe.org/2015/08/04/using-vagrant-docker-machine-together/)

        docker-machine create -d generic \
        --generic-ssh-user vagrant \
        --generic-ssh-key ~/.vagrant.d/insecure_private_key \
        --generic-ip-address 192.168.33.10 \
        --engine-install-url "https://test.docker.com" \
        <name of the vm, up to you>

    Run the above in a terminal and after docker finishes creating the vm, run `docker-machine ls`, and you should be able to see the vm running

    ![VM runing screenshot]({{ site.baseurl }}/public/image/vm_running.jpg)

7. After docker machine is created, we can run a docker container

        docker run -d -p 8080:80 nginx

    Now we can use any computer in our local network to visit the nginx server that we just created that resides in a container running in a vagrant-based  vm on our computer!

    ![Nginx running]({{ site.baseurl }}/public/image/ip_mapped.png)
