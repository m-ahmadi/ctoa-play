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
8. **Send Message.**
   - Choose a message type, fill out the required/optional fields, and click
     **`Send`**.
   - You can filter messages shown in the list by two options:
     - **`👉👈`** Two-Way Messages
     - **`👉`** One-Way Messages
9. **View Responses.**
   - Server responses are displayed in the response panel.
10. **Control Event-Like Responses.**
    - Check/uncheck items in **`🔔 Events`** to allow/disallow their responses to be
      shown.

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

## 📜 License

MIT License. See [LICENSE](./LICENSE) for details.
