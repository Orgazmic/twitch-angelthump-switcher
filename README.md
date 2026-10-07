# Twitch → AngelThump Player Switcher

Tampermonkey userscript that adds a button to Twitch channel pages. Click it, type an [AngelThump](https://angelthump.com) channel name, and the Twitch player on the same page is replaced with that AngelThump stream. Twitch chat stays untouched.

![AngelThump button next to Follow, Gift a Sub and Subscribe](assets/img1.jpg)

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari).
2. **[Click here to install the script](https://raw.githubusercontent.com/orgazmic/twitch-angelthump-switcher/main/twitch-angelthump-switcher.user.js)** and confirm in Tampermonkey.

## Usage

1. Open any Twitch channel page (`https://www.twitch.tv/<channel>`).
2. Click the **AngelThump** button in the channel header, next to Follow / Gift a Sub / Subscribe. It uses Twitch's native button styling and turns purple while active.
3. Enter the AngelThump channel name (prefilled with the current Twitch channel).
4. The AngelThump player loads over the Twitch player.
5. Click **Back to Twitch** to restore the original player.

## How it works

- Injects the button into `[data-target="channel-header-right"]` using a `MutationObserver`, so it survives Twitch's SPA navigation.
- Overlays an iframe pointing to `https://player.angelthump.com/?channel=<name>` on top of `.video-player`.
- Pauses the underlying Twitch `<video>` while active, so there is no double audio, and resumes it on **Back to Twitch**.
- Removes the AngelThump frame automatically when you navigate to another channel.

## Troubleshooting

If Twitch changes its markup, update these selectors in the script:

| Purpose | Selector |
| --- | --- |
| Button host | `[data-target="channel-header-right"]` |
| Player container | `.video-player`, `[data-a-target="video-player"]` |

## Disclaimer

- This project is **not affiliated with, endorsed by, or sponsored by Twitch Interactive, Inc. or AngelThump**. "Twitch" and "AngelThump" and their logos are trademarks of their respective owners.
- The script only changes how the page is displayed in your own browser. It does not host, capture, rebroadcast, or redistribute any stream. The AngelThump player is embedded from AngelThump's own public player URL.
- You are responsible for how you use it, including compliance with the Terms of Service of Twitch and AngelThump and the rights of the streamers whose content you watch.
- Provided "as is", without warranty of any kind. See [LICENSE](LICENSE).

## License

[MIT](LICENSE)