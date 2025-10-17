# 🎠 cTrader OpenAPI Playground

A playground for experimenting with the
[cTrader OpenAPI](https://help.ctrader.com/open-api/).

Connect to the API, send messages, and view responses, all from a simple,
interactive web interface.

This project was developed as a complement to the
[cTrader OpenAPI Community Docs](https://m-ahmadi.github.io/ctoa/).

## ✨ Features

- **⚙️ Auto-Setup Options** – Configure repetitive tasks like connecting,
  authentication, heartbeating, and more to be automatic.
- **✉️ Dynamic Message Builder** – Automatic form generation for API messages,
  with hints about message fields and their types.
- **🗨️ Server Response Viewer** – View the server's response in a formatted and
  syntax-highlighted `JSON` code block.
- **🎛️ Global Message Fields** – Set global values for common message fields
  which will get automatically inserted if a message has such fields.
- **👁️ Visual Indicators** – See visually when heartbeat exchanges are happening
  or event-like messages are coming from the server.
- **🔔 Event Controllers** – Control which event-like message response should be
  shown.
- **💾 Persistent Options** – Whatever option you change will remain the same on
  future visits.
- **🎡 Playground Experience** – Perfect for testing, debugging, and learning
  how cTrader OpenAPI works.

## 📖 Usage

1. **Go to
   [live URL where app is hosted](https://m-ahmadi.github.io/ctoa-play).**
   - You can also `git clone` the repo and serve the `doc` folder locally.
2. **Provide your credentials.**
   - Click **`Credentials`**, and input them.
   - You can choose to remember them, so no re-entering necessary on future
     visits.
   - You can also forget remembered credentials.
3. **Connect to the server.**
   - Click **`Connect`**.
   - You can check `☑auto` to make it automatic on future visits.
4. **Authenticate your application.**
   - Click **`Auth App`**.
   - You can check **`☑auto`** to make it automatic on future visits.
5. **Load accounts.**
   - Load all the accounts associated with your application.
   - You can also choose to lock `🔒` to one account, so no need for loading all
     accounts on future visits.
6. **Authenticate an account.**
   - Click the **`Auth`** button beside the selected account.
   - Check **`☑auto`** to make it automatic on future visits.
7. **Load symbols.**
   - Load all the symbols for an authenticated account.
   - You can also check **`☑auto`** to make it automatic on future visits.
   - You can also choose to lock `🔒` to one symbol, so no need for loading all
     symbols on future visits.
8. **Send message.**
   - Choose a message type, fill out the required/optional fields, and click
     **`Send`**.
   - You can filter messages shown in the list by two options:
     - **`👉👈`** Two-Way Messages
     - **`👉`** One-Way Messages
9. **View responses.**
   - Server responses are displayed in the response panel.
10. **Control event-like responses.**
    - Check/uncheck items in **`🔔 Events`** to allow/disallow their responses
      to be shown.

## 💡 Why This Project?

The cTrader OpenAPI is great and powerful but can be cumbersome at times,
especially for quick tests or experiments. This is mostly due to the nature of
socket communication and has nothing to do with the API itself. For example, all
the extra work related to opening and maintaining the connection, multi-step
authentication processes and exchanging messages.

This playground simplifies the process by providing a UI for the repetitive
steps and options for automation, allowing the user to focus on building request
messages, and sending them and viewing server responses. In fact, server
responses contain a lot of insightful information and are an excellent resource
for learning more about the inner-workings of the API. Hopefully this will make
development, testing, and learning faster and easier.

## 🛡️ Security Concerns

**TLDR:** **Always use demo accounts or live accounts with very small balances
for testing.**

I'm an independent developer and I have no association with the cTrader company.
This app could technically steal your credentials with a single extra line of
code. Obviously I'm not doing that, but why would you trust me? You shouldn't.

Even if I had your credentials, I couldn't withdraw funds. I have no access to
your broker's withdrawal system. The worst I could do is place bad trades and
drain your account. **The safest mindset is to assume that I will steal your
credentials. With that assumption, you'll take proper precautions.**

If you assume that I will steal your credentials, then you would be extra
careful with the `accessToken` you generate and to which accounts you give trade
permission. So even if you want to test some aspect of the API that requires a
live account with trade permission, you should choose a live account with a
small balance, and give trade permission on that account only.

### Summary of Methods for Ensuring Credentials Safety

1. **Check the Source Code for Credentials Hijacking**

   You can read the source to make sure there's no credentials hijacking going
   on, or ask ChatGPT to do it, for example with a prompt like:

   ```
   Read this source code and tell me if it hijacks my credentials or not:
   https://raw.githubusercontent.com/m-ahmadi/ctoa-play/refs/heads/master/docs/index.html
   https://raw.githubusercontent.com/m-ahmadi/ctoa-play/refs/heads/master/docs/index.js
   ```

   While this pretty much ensures that your credentials are safe on my hosted
   page, I can still change the code in the future. This only stays true if you
   monitor repository commits and re-check the source code after every change.
   You can watch this repository on GitHub to get notified of any new commits.

2. **Using Your Own Local Version**

   You can clone the repository and serve your own local version. This way, you
   don't have to worry about future changes once you do the source code checking
   process.

3. **Using Hosted Version**

   You can use the hosted version, but be extra careful about the `accessToken`
   you use on there. For example, give trade permission to demo accounts only.

   If you want to use a live account, choose an account with a small balance.
   Most brokers allow you to easily create however many live accounts you want
   with just one click. This makes it easy to create a dedicated live account
   for testing.

## 📜 License

MIT License. See [LICENSE](./LICENSE) for details.
