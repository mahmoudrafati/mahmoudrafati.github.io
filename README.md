# Mahmoud Rafati's GitHub Pages

This repository contains a collection of projects and tools, including a Yu-Gi-Oh! Life Points Overlay for streaming.

## Yu-Gi-Oh! Life Points Overlay

A web-based life points tracker for Yu-Gi-Oh! duels designed for streaming with Prism Live Studio or similar software.

### Features

- Real-time synchronization between controller and overlay
- Beautiful UI with animations for life point changes
- Mobile-friendly control panel
- Works with Prism Live Studio's browser source
- P2P connection using PeerJS (no server costs)

### How to Use

1. **Control Panel:**
   - Open the main page and click on "Launch Controller"
   - Wait a few seconds for the connection to establish
   - You'll see a "Bereit (warte auf Overlay)" message when ready

2. **Overlay for Streaming:**
   - From the control panel, click the "Nur Overlay anzeigen" button
   - This opens the overlay view in a new tab
   - Add this overlay URL to your streaming software as a browser source

3. **Life Points Control:**
   - Use the +/- buttons to adjust life points
   - Type player names in the input fields
   - Use the reset button to set both players back to 8000 LP

### Implementation Details

- The overlay uses PeerJS for peer-to-peer communication
- LocalStorage is used as a backup for offline use
- Responsive design works on mobile devices

## Hosting on GitHub Pages

This repository is set up to be hosted on GitHub Pages. When changes are pushed to the main branch, they will automatically be deployed.

To set up GitHub Pages:

1. Go to your repository settings
2. Navigate to "Pages" section
3. Select the branch to deploy (usually "main")
4. Save your changes

Your site will be available at `https://yourusername.github.io/repository-name/`.
