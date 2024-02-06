const chatInput = document.querySelector("#chat-input");
const sendButton = document.querySelector("#send-btn");
const chatContainer = document.querySelector(".chat-container");
const themeButton = document.querySelector("#theme-btn");
const deleteButton = document.querySelector("#delete-btn");
const settingButton = document.querySelector("#setting-btn");

let userText = null;

const loadDataFromLocalstorage = () => {
    const themeColor = localStorage.getItem("themeColor");

    document.body.classList.toggle("light-mode", themeColor === "light_mode");
    themeButton.innerText = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";

    const defaultText = `<div class="default-text">
                            <h1>ChatDB</h1>
                            <p>Start a conversation with database</p>
                        </div>`

    chatContainer.innerHTML = localStorage.getItem("all-chats") || defaultText;
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
}

const createChatElement = (content, className) => {
    const chatDiv = document.createElement("div");
    chatDiv.classList.add("chat", className);
    chatDiv.innerHTML = content;
    return chatDiv;
}

const getChatResponse = async (incomingChatDiv) => {
    const API_URL = "/chat";
    let pElement = document.createElement("p");

    let spanElement = null

    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            input_text: userText,
        }),
    };

    try {
        const response = await (await fetch(API_URL, requestOptions)).json();
        console.log(response)
        if (response.success) {
            if(response.type === 'value')
            {
                pElement.textContent = typeof response.result === 'number' ? response.result.toString() : response.result.trim();
                spanElement = document.createElement("span");
                spanElement.setAttribute("onclick", "copyResponse(this)");
                spanElement.classList.add("material-symbols-rounded");
                spanElement.textContent = "content_copy";
            }
            else if(response.type === 'table') {
                pElement = document.createElement("div");
                pElement.innerHTML = response.result;
                spanElement = document.createElement("span");
                spanElement.classList.add("material-symbols-rounded");
                spanElement.textContent = "table";
            }
            else{
                pElement = document.createElement("div");

                let downloadLink = document.createElement("a");
                let icon = document.createElement("i");

                icon.classList.add('fa-solid','fa-download');
                icon.style.marginLeft= "5px";
                downloadLink.href = "data:text/csv;charset=utf-8," + encodeURIComponent(response.result);
                downloadLink.download = "table.csv";
                downloadLink.innerText = "table.csv";
                downloadLink.appendChild(icon);

                pElement.innerHTML = "";
                pElement.appendChild(downloadLink);
            }
        } else {
            throw new Error(response.error_message || "Unknown error");
        }
    } catch (error) {
        pElement.classList.add("error");
        pElement.textContent = `Oops! Something went wrong`;
    }

    incomingChatDiv.querySelector(".typing-animation").remove();
    incomingChatDiv.querySelector(".chat-details").appendChild(pElement);
    if (spanElement != null)
        incomingChatDiv.querySelector(".chat-content").appendChild(spanElement);

    localStorage.setItem("all-chats", chatContainer.innerHTML);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
};

const copyResponse = (copyBtn) => {
    const reponseTextElement = copyBtn.parentElement.querySelector("p");
    navigator.clipboard.writeText(reponseTextElement.textContent);
    copyBtn.textContent = "done";
    setTimeout(() => copyBtn.textContent = "content_copy", 1000);
}

const showTypingAnimation = () => {
    const html = `<div class="chat-content">
                    <div class="chat-details">
                        <i class="fa-solid fa-robot" style="background-color:#d32355; padding:8px 5px; border-radius:50%"></i>
                        <div class="typing-animation">
                            <div class="typing-dot" style="--delay: 0.2s"></div>
                            <div class="typing-dot" style="--delay: 0.3s"></div>
                            <div class="typing-dot" style="--delay: 0.4s"></div>
                        </div>
                    </div>
                </div>`;
    const incomingChatDiv = createChatElement(html, "incoming");
    chatContainer.appendChild(incomingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    getChatResponse(incomingChatDiv);
}

const handleOutgoingChat = () => {
    userText = chatInput.value.trim();
    if(!userText) return;

    chatInput.value = "";
    chatInput.style.height = `${initialInputHeight}px`;

    const html = `<div class="chat-content">
                    <div class="chat-details">
                        <i class="fa-solid fa-user" style="background-color:#000; padding:8px; border-radius:50%"></i>
                        <p>${userText}</p>
                    </div>
                </div>`;

    const outgoingChatDiv = createChatElement(html, "outgoing");
    chatContainer.querySelector(".default-text")?.remove();
    chatContainer.appendChild(outgoingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    setTimeout(showTypingAnimation, 500);
}

deleteButton.addEventListener("click", () => {
    if(confirm("Are you sure you want to delete all the chats?")) {
        localStorage.removeItem("all-chats");
        loadDataFromLocalstorage();
    }
});

settingButton.addEventListener("click", () => {
    if(confirm("do you want to change connection information ?")) {
        fetch('/clear_session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/';
                } else {
                    console.error('Failed to clear session.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
});

themeButton.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    localStorage.setItem("themeColor", themeButton.innerText);
    themeButton.innerText = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";
});

const initialInputHeight = chatInput.scrollHeight;

chatInput.addEventListener("input", () => {
    chatInput.style.height =  `${initialInputHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleOutgoingChat();
    }
});

loadDataFromLocalstorage();
sendButton.addEventListener("click", handleOutgoingChat);
