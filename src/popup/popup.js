import { sourceFileToVSCodeUrl, getSettings } from '../utils/common.js';

// Update createSourcePathLink to handle async
async function createSourcePathLink(entry) {
    const link = document.createElement('a');
    try {
        const vscodeUrl = await sourceFileToVSCodeUrl(entry);
        link.href = vscodeUrl;
    } catch (error) {
        console.error('Error generating VS Code URL:', error);
        link.href = '#'; // Fallback in case of error
    }
    link.textContent = `${entry.repo} ${entry.remotePath}`;
    link.target = '_blank';
    link.classList.add('source-path-link');
    return link;
}

// Update DOMContentLoaded event listener to handle async
async function populateFilePaths(entries) {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';

    for (const entry of entries) {
        const link = await createSourcePathLink(entry);
        const listItem = document.createElement('li');
        listItem.appendChild(link);
        fileList.appendChild(listItem);
    }

    if (entries.length == 0) {
        const noFilesMessage = document.createElement('li');
        noFilesMessage.textContent = 'No source files found.';
        fileList.appendChild(noFilesMessage);
    }
}

document.addEventListener('DOMContentLoaded', async (event) => {
    console.log('Getting source paths...');
    const response = await chrome.runtime.sendMessage({ action: 'getSourceFilePaths' });
    console.log(`Received source file paths from background script:`, response);
    if (response && response.sourceFilePaths && response.sourceFilePaths.length > 0) {
        await populateFilePaths(response.sourceFilePaths);

        if (response.sourceFilePaths.length == 1) {
            if ((await getSettings()).autoOpenSingleFile) {
                const firstEntry = response.sourceFilePaths[0];
                try {
                    const vscodeUrl = await sourceFileToVSCodeUrl(firstEntry);
                    window.open(vscodeUrl, '_blank');
                } catch (error) {
                    console.error('Error opening first source path:', error);
                }
            }
        }
    }
});

document.getElementById('settings-button').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

// Whenever the text of the filter changes, get all the source-path-links, hide the ones
// that do not match the filter's text as a regex, and show the ones that do.
document.getElementById('filter-file-list').addEventListener('input', (event) => {
    const filterText = event.target.value.trim();
    const regex = new RegExp(filterText, 'i');

    const links = Array.from(document.querySelectorAll('.source-path-link'));
    links.forEach(link => {
        const show = !!regex.test(link.textContent);
        link.parentElement.style.display = show ? '' : 'none';
    });
});

// If the user hits enter in the filter text box and there is only one file that matches
// the filter, open it in a new tab.
document.getElementById('filter-file-list').addEventListener('keyup', async (event) => {
    if (event.key === 'Enter') {
        const visibleLinks = Array.from(document.querySelectorAll('.source-path-link'))
            .filter(link => link.parentElement.style.display !== 'none');

        if (visibleLinks.length === 1) {
            const url = visibleLinks[0].href;
            window.open(url, '_blank');
        }
    }
});

// Put focus on the filter text box when the popup opens.
document.getElementById('filter-file-list').focus();