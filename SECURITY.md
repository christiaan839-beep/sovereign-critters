# Security

These plugins draw characters and keep a small diary in the plugin's own store. They make no network requests of their own and read nothing outside the session, apart from what is disclosed here: `mods` runs the local `claude plugin` command (its `install` downloads a mod through it) and reads the changelogs of installed mods, and `guard` runs `git` locally to ask where a push goes. The one exception is opt-in and off by default: `/critter talk on` asks the model for one short line after a turn, carrying only numbers (see the critter-buddy README).

To report a problem, use GitHub's private vulnerability reporting on this repository (Security tab, "Report a vulnerability"). Please do not open a public issue for a vulnerability. We aim to reply within a week.
