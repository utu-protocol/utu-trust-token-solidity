GIT_DESCR = $(shell git describe --tags --always)

# docker image
DOCKER_IMAGE = utu-trust-api-chainlink-node

GCP_PROJECT_ID = able-reef-372206
DOCKER_PROVIDER = gcr.io
DOCKER_REPO = ${DOCKER_PROVIDER}/$(GCP_PROJECT_ID)/$(DOCKER_IMAGE)

DOCKER_TAG = $(GIT_DESCR)
# build paramters
OS = linux
ARCH = amd64
# K8S
K8S_NAMESPACE = utu-trust-api
K8S_DEPLOYMENT = trust-api-chainlink-node

.PHONY: list
list:
	@$(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$' | xargs

default: docker-build

docker: docker-build

# One needs to run this once only:
docker-login:
	gcloud auth configure-docker

docker-build:
	@echo Building Docker image...
	docker build --platform linux/amd64 --build-arg DOCKER_TAG='$(DOCKER_TAG)' -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	@echo Done

docker-push:
	@echo Pushing Docker image...
	docker tag $(DOCKER_IMAGE):$(DOCKER_TAG) $(DOCKER_REPO):$(DOCKER_TAG)
	docker push $(DOCKER_REPO):$(DOCKER_TAG)
	@echo Done

docker-run:
	docker-compose up

k8s-deploy:
	@echo Deploying to Kubernetes...
	kubectl -n $(K8S_NAMESPACE) set image deployment/$(K8S_DEPLOYMENT) $(K8S_DEPLOYMENT)=$(DOCKER_REPO):$(DOCKER_TAG)
	@echo Done

k8s-rollback:
	@echo Rolling back Kubernetes deployment...
	kubectl -n $(K8S_NAMESPACE) rollout undo deployment/$(K8S_DEPLOYMENT)
	@echo Done

changelog:
	git-chglog --output CHANGELOG.md

git-release:
	@echo Making release...
	git tag $(GIT_DESCR)
	git-chglog --output CHANGELOG.md
	git tag $(GIT_DESCR) --delete
	git add CHANGELOG.md && git commit -m "$(GIT_DESCR)" -m "Release"
	git tag -a "$(GIT_DESCR)" -m "Release"
	@echo Release complete

_release-patch:
	$(eval GIT_DESCR = $(shell git describe --tags | awk -F '("|")' '{ print($$1)}' | awk -F. '{$$NF = $$NF + 1;} 1' | sed 's/ /./g'))
release-patch: _release-patch git-release

_release-minor:
	$(eval GIT_DESCR = $(shell git describe --tags | awk -F '("|")' '{ print($$1)}' | awk -F. '{$$(NF-1) = $$(NF-1) + 1;} 1' | sed 's/ /./g' | awk -F. '{$$(NF) = 0;} 1' | sed 's/ /./g'))
release-minor: _release-minor git-release

_release-major:
	$(eval GIT_DESCR = $(shell git describe --tags | awk -F '("|")' '{ print($$1)}' | awk -F. '{$$(NF-2) = $$(NF-2) + 1;} 1' | sed 's/ /./g' | awk -F. '{$$(NF-1) = 0;} 1' | sed 's/ /./g' | awk -F. '{$$(NF) = 0;} 1' | sed 's/ /./g' ))
release-major: _release-major git-release