---
type: fixed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder now shows where the open file is kept. A cloud mark in the top bar shows whether the file is in the cloud and up to date, still syncing, offline, failed, or only in this browser, and the Share dialog says the same. A Playground file, which stays in this browser, now says so in Share and offers "Move out of the Playground" to put it in the cloud; before, it read "on its way to the cloud" and never went up. Two sync fixes: a save that fails to go up (offline, say) is now marked and sent on the next sync, where before it stayed out of the cloud until the page was edited again; and a file moved out of the Playground now goes up straight away.
