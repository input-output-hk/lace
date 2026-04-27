# Contributing

Thanks for your interest in Lace. We welcome engagement from the community,
and we've tried to make the paths to contributing clear.

## This is a mirror repository

This repository is a **published mirror** of the Lace source and release
artifacts. The active development repository is maintained privately by
the Lace team at Input Output. Every tagged release here corresponds to
a snapshot of that private source, produced by an automated publishing
workflow and reviewed before merge.

## Ways to contribute

Because this repository is a mirror, not the development source of truth,
we route contributions differently depending on shape:

### 🐛 Bug reports and feature requests

Use the issue templates:

- [Report a bug](https://github.com/input-output-hk/lace/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/input-output-hk/lace/issues/new?template=feature_request.yml)

We triage every issue. Accepted changes are scheduled into an upcoming
release; the issue is closed (manually, today) when the release
containing the fix is published here. We plan to automate this from
release commit references.

### 🩹 One-off patches or proofs of concept

If you've already written the change, open a bug report or feature
request and attach your patch to the issue — inline diff, gist link, or
link to your fork. We review it and, if we accept it, apply it via the
internal source of truth with attribution in the release notes.

### 🤝 Substantive contributions

For larger work — a sizeable feature, a package-level change, ongoing
contribution in an area — please
[open a contribution proposal](https://github.com/input-output-hk/lace/issues/new?template=contribution_proposal.yml)
**before** investing serious time. We'll reach out to discuss scope, fit
with the roadmap, and how best to collaborate. Depending on the scope,
that may involve a Contributor License Agreement and coordinated access
to the internal source of truth so your work can flow cleanly into
releases.

We read every proposal. If what you want to work on aligns with where
we're going, we want to find a way to make it happen.

### 🔐 Security

For suspected vulnerabilities, follow the process in [SECURITY.md](./SECURITY.md).
Do not open a public issue for a security matter.

## About pull requests

Pull requests opened directly against this mirror are automatically closed
with a pointer to this document — not to turn you away, but because a PR
here can't flow back into real releases and would leave your work stranded.

The channels above get your change into the places where it can actually
have effect. If you're unsure which fits best, open an issue and ask —
we'll redirect if needed.

## License

Contributions, when accepted and incorporated via the internal source of
truth, are licensed under the [Apache License 2.0](./LICENSE) under which
this project is distributed.
