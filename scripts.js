// Handles your frontend UI logic.

//Chrome localstorage works with callback functions to handle the returned data!
//Chrome get returns undefined when the property doesn't exist.
//Use it with chrome.storage.local. (set/get)

//Link object structure:
//{links: [{title: "Blah Website", url: "blahblah.com", related: ["games", "food", "school"]}]}

//TODO: Make the key system work better (ensure it saves and stuff)

const addLinkButton = document.getElementById("addLinkButton");
const addCurrentButton = document.getElementById("addCurrentButton");
const exportButton = document.getElementById("exportButton");
const importButton = document.getElementById("importButton");
const linkSearch = document.getElementById("linkSearch");
const linkContainer = document.getElementById("linkContainer");
let currentLinks = [];
let searchedLinks = [];
let currentSearch = "";

//Prints out the saved links
function printLinkTest() {
    chrome.storage.local.get("links", (result) => {
        console.log(result.links);
    });
}

//Constructs the structure for the link data
function makeLink(title, url) {
    const newLink = { title: title, url: url, related: [] };
    return newLink;
}

function getSearchLink(search) {
    return "https://search.brave.com/search?q=" + search;
}

function openPage(url) {
    chrome.tabs.create({ url: url });
}

//Makes a div given a link, with sub-buttons that do other things
function makeLinkButton(link) {
    const linkDiv = document.createElement("div");
    linkDiv.classList.add("linkItem");
    linkDiv.title = link.url; //URL tooltip

    const textDiv = document.createElement("div");
    const titleP = document.createElement("p");
    const urlP = document.createElement("p");
    titleP.textContent = link.title;
    urlP.textContent = link.url;
    titleP.classList.add("linkTitleText");
    urlP.classList.add("linkURLText");
    textDiv.appendChild(titleP);
    textDiv.appendChild(urlP);
    linkDiv.appendChild(textDiv);

    //Add the change title prompt
    titleP.addEventListener("click", () => {
        const newTitle = prompt("Change link title?");
        if (!newTitle) return;
        if (newTitle.trim().length == 0) return;
        titleP.textContent = newTitle;
        link.title = newTitle;
        updateLinks();
    });

    const buttonDiv = document.createElement("div");
    buttonDiv.classList.add("linkButtonDiv");

    const relativeDiv = document.createElement("div");
    relativeDiv.classList.add("relativeDiv");
    relativeDiv.style.display = "none";

    //Allows the user to go to the link listed
    const goButton = document.createElement("button");
    goButton.textContent = "Go";
    goButton.classList.add("linkGoButton", "linkButton");
    goButton.addEventListener("click", () => {
        openPage(link.url);
    });

    //Allows editing the relative keys for the object (better searches)
    const editButton = document.createElement("button");
    editButton.textContent = "Edit Keys";
    editButton.classList.add("linkEditButton", "linkButton");
    editButton.addEventListener("click", () => {
        if (relativeDiv.style.display == "none") {
            relativeDiv.style.display = "block";
        } else {
            relativeDiv.style.display = "none";
        }
    });

    //Button that removes this link object from the list
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.classList.add("linkRemoveButton", "linkButton");
    removeButton.addEventListener("click", async () => {
        const confirmation = confirm("Are you sure you want to delete '" + link.url + "'?");
        if (!confirmation) return;
        await removeLink(link);
    });

    buttonDiv.appendChild(goButton);
    buttonDiv.appendChild(editButton);
    buttonDiv.appendChild(removeButton);

    //Div that displays all of the related keys to this url
    const addKeyButton = document.createElement("button");
    addKeyButton.textContent = "Add a Key";
    addKeyButton.classList.add("addKeyButton");
    addKeyButton.addEventListener("click", async () => {
        const keyText = prompt("Please enter the key:");
        if (!keyText) return;
        if (link.related.indexOf(keyText) != -1) {
            console.log("Key '" + keyText + "' already found in link's related keys.");
            return;
        }

        link.related.push(keyText);
        relativeDiv.appendChild(makeKeyButton(keyText));
        await updateLinks();
    });

    const resetRelativeDiv = () => {
        relativeDiv.innerHTML = "";
        relativeDiv.appendChild(addKeyButton)
        for (let key of link.related) {
            const keyButton = makeKeyButton(key);
            relativeDiv.appendChild(keyButton);
        }
    }

    const makeKeyButton = (keyText) => {
        const keyButton = document.createElement("button");
        keyButton.classList.add("keyButton");
        keyButton.innerText = keyText;
        keyButton.addEventListener("click", async () => {
            link.related = link.related.filter((testKey) => testKey != keyText);
            await updateLinks();
            resetRelativeDiv();
        });
        return keyButton;
    }

    resetRelativeDiv();

    linkDiv.appendChild(buttonDiv);
    linkDiv.appendChild(relativeDiv);
    return linkDiv;
}

//Checks to see if the link is a possible result of the given search
function matchSearch(link, search) {
    let matchCount = 0;
    search = search.toLowerCase();
    let testList = [search];
    testList.push(...search.split("+"));

    for (let test of testList) {
        if (test.length == 0) matchCount++;

        if (link.title.toLowerCase().indexOf(test) != -1) matchCount++;
        if (link.url.toLowerCase().indexOf(test) != -1) matchCount++;

        if (test.length > 1) {
            for (let relative of link.related) {
                if (relative.toLowerCase().indexOf(test) != -1) matchCount++;
            }
        }
    }

    //Adding based on matching characters
    let charCount = 0;
    let useChars = link.title.split("");
    for (let char of search.split("")) {
        const index = useChars.indexOf(char);
        if (index != -1) {
            charCount++;
            useChars.splice(index, 1);
        }
    }
    matchCount += Math.floor(2 * (charCount/Math.max(link.title.length, 1)));

    return matchCount;
}

function updateLinkButtons() {
    //Filter out the links that don't match the current search query
    linkContainer.innerHTML = "";
    searchedLinks = currentLinks.filter((link) => (matchSearch(link, currentSearch) > 0));
    searchedLinks.sort((a, b) => matchSearch(b, currentSearch) - matchSearch(a, currentSearch));
    for (let link of searchedLinks) {
        const linkButton = makeLinkButton(link);
        linkContainer.appendChild(linkButton);
    }
}

async function addLinks(newLinkList) {
    currentLinks.push(...newLinkList)
    await updateLinks();
    updateLinkButtons();
}

async function addLink(newLink) {
    currentLinks.push(newLink)
    await updateLinks();
    updateLinkButtons();
}

//Updates the save state of all links (none were added/removed, but properties may have been edited)
async function updateLinks() {
    await new Promise((resolve) => chrome.storage.local.set({ "links": currentLinks }, resolve));
}

async function removeLink(link) {
    currentLinks = currentLinks.filter((testLink) => testLink != link);
    await new Promise((resolve) => chrome.storage.local.set({ "links": currentLinks }, resolve));
    updateLinkButtons();
}

//Sets the currentLinks variable to the stored links
async function retrieveLinks() {
    await new Promise((resolve) => {
        chrome.storage.local.get("links", (data) => {
            currentLinks = data.links || [];
            resolve();
        });
    })
}

//Helper function for the exportLinks() to download the file
function downloadFile(data, filename, mimeType = 'text/plain') {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
//Prompts the user to export the given links as a JSON file
async function exportLinks() {
    let fileContent = JSON.stringify(currentLinks, null, 2);
    downloadFile(fileContent, "links.json", "application/json");
}

//Helper function for the importLinks() to prompt for the JSON file
async function openFilePrompt(callback) {
  const input = document.createElement('input');
  input.type = 'file';
  input.onchange = function(event) {
    const file = event.target.files[0];
    if (file) {
        callback(file);
    }
  };
  input.click();
}
//Prompts the user to import links from a given JSON file
async function importLinks() {
    openFilePrompt(async (file) => {
        try {
            const existingUrls = new Set(currentLinks.map(l => l.url));

            const text = await file.text();
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
                const linkList = [];
                for (const link of data) {
                    if (
                        typeof link.title !== "string" ||
                        typeof link.url !== "string" ||
                        !Array.isArray(link.related)
                    ) {
                        alert("Failed to import links! Improper format.")
                        console.log("Incorrect link format: " + link);
                        return;
                    }
                    // Don't duplicate stuff!
                    if (existingUrls.has(link.url)) {
                        console.log("Skipping link because it is a dupe: " + link);
                        continue;
                    }

                    linkList.push({
                        title: link.title,
                        url: link.url,
                        related: [...link.related]
                    });
                }

                await addLinks(linkList);
                alert("Imported links successfully!");
            }
        } catch (err) {
            console.error("Failed to read or parse file:", err);
        }
    });
}

async function main() {
    await retrieveLinks();
    updateLinkButtons();
}

addLinkButton.addEventListener("click", () => {
    //Get the user's input to add the new link
    let linkTitle = prompt("(Optional) Name for your link:")

    const linkUrl = prompt("Link for your site:");
    if (!linkUrl) {
        console.log("Link input was null.");
        return;
    }
    //Sets the title to the URL if there was no title entered
    if (!linkTitle) {
        linkTitle = linkUrl;
    }

    const newLink = makeLink(linkTitle, linkUrl);
    addLink(newLink);
    alert("Successfully added '" + linkTitle + "' to your list!");
});

addCurrentButton.addEventListener("click", () => {
    //Use the current page's link to add
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        const useTab = tabs[0];
        const linkTitle = useTab.title;
        const linkUrl = useTab.url;
        const newLink = makeLink(linkTitle, linkUrl);
        addLink(newLink);
        alert("Successfully added '" + linkTitle + "' to your list!");
    });
});

linkSearch.addEventListener("input", () => {
    currentSearch = linkSearch.value;
    updateLinkButtons();
});
//When user presses enter, go to the top link
linkSearch.addEventListener("keydown", (e) => {
    // Press ctrl + # to go to that option on the current list
    if (e.ctrlKey) {
        let num = parseInt(e.key);
        if (isNaN(num)) return;
        if (num >= searchedLinks.length) return;
        openPage(searchedLinks[num].url);
    }

    if (e.key !== "Enter") return;
    if (searchedLinks.length === 0 || e.shiftKey) {
        openPage(getSearchLink(currentSearch));
        return;
    }

    openPage(searchedLinks[0].url);
});

exportButton.addEventListener("click", () => exportLinks());
importButton.addEventListener("click", () => importLinks());

window.onload = function() {
    linkSearch.focus();
};

main();