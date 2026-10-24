# Security

Do not put API keys, personal media or exported videos in issues or pull requests. Report a suspected vulnerability privately through GitHub's private vulnerability reporting when enabled by the repository maintainer.

The initial supported release is 1.02. Include the version, affected platform, reproduction steps and impact in a private report. If private reporting has not been enabled, open an issue asking the maintainer to enable it without posting exploit details or sensitive files.

The application processes local media. Native commands are accepted only from the bundled application page; export-history commands resolve registered entries rather than arbitrary user-supplied command lines. Dependency archives are restored with a pinned version and checksum. Download executable releases only from the repository owner's release page.

Public Windows releases use a separately installed FFmpeg executable. Select a trusted binary: the saved path is executed locally for video export. The application does not require an account, collect telemetry, or upload user media. Runtime and SDK installation/downloads are handled separately from media processing.
