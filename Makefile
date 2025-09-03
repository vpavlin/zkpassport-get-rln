IMAGE := quay.io/vpavlin0/zkpassport-rln

all: push

build:
	node build2.js
container: build
	docker build -t $(IMAGE) .
push: container
	docker push $(IMAGE)