import * as fastboot from "../dist/fastboot.mjs";
let device = new fastboot.FastbootDevice();
window.device = device;

window.onload = function () {
    const toggleInput = document.getElementById('toggle-input');
    const lightStyle = document.getElementById('light');
    const darkStyle = document.getElementById('dark');
    const overlay = document.getElementById('theme-overlay');
    let currentTheme = 'dark';
    lightStyle.disabled = true;
    darkStyle.disabled = false;
    toggleInput.checked = false;

    toggleInput.addEventListener('change', function () {
        const rect = toggleInput.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const ripple = document.createElement('div');
        ripple.className = 'ripple-circle';
        ripple.style.left = `${centerX - 75}px`;
        ripple.style.top = `${centerY - 75}px`;
        ripple.style.width = ripple.style.height = '150px';
        ripple.style.transformOrigin = 'center';
        overlay.appendChild(ripple);

        setTimeout(() => {
            if (currentTheme === 'dark') {
                lightStyle.disabled = false;
                darkStyle.disabled = true;
                currentTheme = 'light';
            } else {
                lightStyle.disabled = true;
                darkStyle.disabled = false;
                currentTheme = 'dark';
            }
        }, 200);

        setTimeout(() => {
            ripple.remove();
            toggleInput.classList.add('toggle-animate');
            setTimeout(() => {
                toggleInput.checked = false;
                toggleInput.blur();
                toggleInput.classList.remove('toggle-animate');
            }, 100);
        }, 500);
    });
};

fastboot.setDebugLevel(2);

function toggleElements(disable) {
    const formElements = document.querySelectorAll("input, button, select");
    const fileTable = document.querySelector(".file-table");
    if (disable === "all") {
        formElements.forEach(element => element.disabled = true);
        if (fileTable) fileTable.classList.add("table-locked");
    } else if (disable === "all-enable") {
        formElements.forEach(element => element.disabled = false);
        if (fileTable) fileTable.classList.remove("table-locked");
    } else {
        formElements.forEach((element) => {
            if (
                !element.classList.contains("connect-button") &&
                !element.classList.contains("download-log-button") &&
                !element.closest(".switchx")
            ) {
                element.disabled = Boolean(disable);
            }
        });
        if (fileTable) fileTable.classList.toggle("table-locked", Boolean(disable));
    }
}

/*
Issue on mobile browser
document.querySelectorAll('select').forEach(function(selectEl) {
    selectEl.addEventListener('change', function() {
        setTimeout(() => {
            this.blur();
        }, 110);
    });
    selectEl.addEventListener('click', function(e) {
        if (this.value === this.dataset.lastValue) {
            setTimeout(() => {
                this.blur();
            }, 110);
        } else {
            this.dataset.lastValue = this.value;
        }
    });
    selectEl.dataset.lastValue = selectEl.value;
});*/

function clearFormElements() {
    const formElements = document.querySelectorAll("input, button, select, textarea");
    const fileTable = document.querySelector("#file-table tbody");
    fileTable.innerHTML = "";

    formElements.forEach((element) => {
        if (element.tagName === "INPUT" && (element.type === "text" || element.type === "file")) {
            element.value = "";
        } else if (element.tagName === "SELECT") {
            element.selectedIndex = 0;
        } else if (element.tagName === "TEXTAREA") {
            element.value = ""; 
        }
    });
}

function scrollToLogs() {
    const resultField = document.querySelector(".result-field");
    if (resultField) {
        const offset = -69;
        const top = resultField.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
            top: top + offset,
            behavior: "smooth"
        });
    }
}

async function connectDevice() {
    let statusField = document.querySelector(".status-field");
    statusField.textContent = "Connecting...";

    try {
        await device.connect();
    } catch (error) {
    if (error.message && error.message.includes("undefined (reading 'getDevices')")) {
        statusField.innerHTML = `
            🙈 xoxo, gossip girl 🙈<br><br>
            ⚠️ Your browser doesn’t support <b><i>WebUSB</i></b> ⚠️<br>
            <b>Please use a modern browser such as Chrome, Edge, or Brave Chromium based!</b>`;
    } else if (error.message && error.message.includes("No device selected")) {
        statusField.innerHTML = `
            ⚠️ <b>Please select your <i>Android</i> device and <i>allow</i> access ⚠️</b><br><br>
            If not visible, check your USB cable and ensure device is in <b><i>fastboot mode</i></b>.`;
    } else {
        statusField.textContent = `Failed to connect to device: ${error.message}`;
    }
    toggleElements(true); 
    return;
    }

    let product = await device.getVariable("product");
    let slot = await device.getVariable("current-slot");
    let serial = await device.getVariable("serialno");
    let bootloaderStatus = await device.getVariable("unlocked"); 
    let userdata_chk = await device.getVariable("partition-type:userdata");
    let userdata_size = await device.getVariable("partition-size:userdata");
    let bootloaderStatusText = bootloaderStatus === "yes" ? "unlocked" : "locked";

    let status = `Connected to : ${product} <br /> Current slot : ${slot} <br /> (serial : ${serial}) <br />Bootloader status: ${bootloaderStatusText}`;

    let sizeInfo = '';
    if (await checkPartition("userdata", userdata_chk, userdata_size)) {
        sizeInfo += `<p style="margin: 0; margin-top: 5px;">Android Partition : ${getSizeString(userdata_size)}</p>`;
    }
    
    if (sizeInfo) {
        status += `<br />${sizeInfo}`;
    }
    statusField.innerHTML = status;
    toggleElements(false); 
    clearFormElements();
}

toggleElements(true); 

function handleDisconnect() {
    let statusField = document.querySelector(".status-field");
    statusField.textContent = "Not connected in Fastboot";
    toggleElements(true); 
}

async function checkDeviceConnection() {
    let statusField = document.querySelector(".status-field");

    try {
        let product = await device.getVariable("product");
        if (product) {
        }
    } catch (error) {
        statusField.textContent = "Device disconnected!";
        toggleElements(true);
    }
    clearFormElements();
}

async function checkPartition(partitionName, partitionChk, partitionSize) {
    return partitionChk;
}

function getSizeString(hex) {
    const size = parseInt(hex, 16);
    const sizeInGB = size / (1024 ** 3);
    const sizeInMB = size / (1024 ** 2);

    if (sizeInGB < 1) {
        return `${sizeInMB.toFixed(2)} MB`;
    }
    return `${sizeInGB.toFixed(2)} GB`;
}

async function sendFormCommand(event) {
    event.preventDefault();
    let inputField = document.querySelector(".command-input");
    let command = inputField.value.trim();
    let resultField = document.querySelector(".result-field");

    if (!command) {
        resultField.textContent = "\nPlease enter a command!\n" + resultField.textContent;
        alert("Please enter a command!");
        return;
    }

    try {
        let result = (await device.runCommand(command)).text;
        resultField.textContent = `\nCommand executed successfully: ${result}\n` + resultField.textContent; 
        alert(`Command executed successfully: ${result}`);
    } catch (error) {
        resultField.textContent = `\nError executing command: ${error.message}\n` + resultField.textContent; 
        alert(`Error executing command: ${error.message}`);
    } finally {
        inputField.value = "";
        await checkDeviceConnection();
    }
}

async function runRebootCommand(command, successMessage) {
    let resultField = document.querySelector(".result-field");
    try {
        let result = (await device.runCommand(command)).text;
        resultField.textContent = `\n${successMessage}\n` + resultField.textContent;
        alert(successMessage);
    } catch (error) {
        resultField.textContent = `\nError during reboot: ${error.message}\n` + resultField.textContent;
        alert(`Error during reboot: ${error.message}`);
    } finally {
        await checkDeviceConnection();
    }
}

const rebootCommands = {
"reboot": () => runRebootCommand("reboot", "Device rebooted successfully!"),
"reboot-bootloader": () => runRebootCommand("reboot-bootloader", "Rebooted to Bootloader successfully!"),
"reboot-recovery": () => runRebootCommand("reboot-recovery", "Rebooted to Recovery successfully!"),
"reboot-fastboot": () => runRebootCommand("reboot-fastboot", "Rebooted to FastbootD successfully!"),
"reboot-edl": () => runRebootCommand("oem edl", "Rebooted to EDL successfully!")
};

async function switchSlot() {
    let resultField = document.querySelector(".result-field");
    try {
        let activeSlot = (await device.runCommand("getvar:current-slot")).text.trim();
        let otherSlot = activeSlot === "a" ? "b" : "a";
        let result = (await device.runCommand(`set_active:${otherSlot}`)).text;
        resultField.textContent = `\nSwitched to slot ${otherSlot}: ${result}\n` + resultField.textContent;
        alert(`Switched to slot ${otherSlot}: ${result} Successfully`);
        document.querySelector(".connect-button").click();
    } catch (error) {
        resultField.textContent = `\nError switching slots: ${error.message}\n` + resultField.textContent;
        alert(`Error switching slots: ${error.message}`);
    } finally {
        await checkDeviceConnection();
    }
}

const fileMapping = {
    "boot.img": "boot_ab",
    "crclist.txt": "crclist",
    "sparsecrclist.txt": "sparsecrclist",
    "sparsecrclist.txt": "sparsecrclist",
    "ksu_boot.img": "boot_ab",
    "ksu-n_boot.img": "boot_ab",
    "magisk_boot.img": "boot_ab",
    "ksu_dtbo.img": "dtbo_ab",
    "ksu-n_dtbo.img": "dtbo_ab",
    "xbl.elf": "xbl_ab",
    "xbl_config.elf": "xbl_config_ab",
    "xbl.img": "xbl_ab",
    "xbl_config.img": "xbl_config_ab",
    "abl.elf": "abl_ab",
    "abl.img": "abl_ab",
    "tz.mbn": "tz_ab",
    "tz.img": "tz_ab",
    "hyp.mbn": "hyp_ab",
    "hyp.img": "hyp_ab",
    "devcfg.mbn": "devcfg_ab",
    "devcfg.img": "devcfg_ab",
    "storsec.mbn": "storsec",
    "storsec.img": "storsec",
    "btfm.bin": "bluetooth_ab",
    "bluetooth.img": "bluetooth_ab",	
    "cmnlib.mbn": "cmnlib_ab",
    "cmnlib64.mbn": "cmnlib64_ab",
    "cmnlib.img": "cmnlib_ab",
    "cmnlib64.img": "cmnlib64_ab",
    "non-hlos.bin": "modem_ab",
    "modem.img": "modem_ab",
    "dspso.bin": "dsp_ab",
    "dsp.img": "dsp_ab",	
    "km41.mbn": "keymaster_ab",
    "keymaster.img": "keymaster_ab",
    "aop.mbn": "aop_ab",
    "aop.img": "aop_ab",	
    "qupv3fw.elf": "qupfw_ab",
    "qupfw.img": "qupfw_ab",
    "imagefv.elf": "imagefv_ab",
    "imagefv.img": "imagefv_ab",
    "uefi_sec.mbn": "uefisecapp_ab",
    "uefisecapp.img": "uefisecapp_ab",
    "multi_image.mbn": "multiimgoem_ab",
    "metadata.img": "metadata",
    "vbmeta_system.img": "vbmeta_system_ab",
    "vbmeta.img": "vbmeta_ab",
    "dtbo.img": "dtbo_ab",
    "userdata.img": "userdata",
    "rescue.img": "rescue",
    "vendor_boot.img": "vendor_boot_ab",
    "cust.img": "cust",
    "fw_4j1ed.img": "fw_4j1ed_ab",
    "fw_4u1ea.img": "fw_4u1ea_ab",
    "LOGO.img": "logo_ab",
    "logo.img": "LOGO_ab",
    "featenabler.img": "featenabler",
    "system.img": "system",
    "system_ext.img": "system_ext",
    "vendor.img": "vendor",
    "odm.img": "odm",
    "product.img": "product",
    "mi_ext.img": "mi_ext",
    "super.img": "super",
    "misc.img": "misc",
    "rootfs.img": "linux"
};

function formatFileSize(size) {
    if (size < 1024) return size + " B";
    if (size < 1024 * 1024) return (size / 1024).toFixed(2) + " KB";
    if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + " MB";
    return (size / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function typeAnimation(element, text, delay = 16) {
    element.value = "";
    let i = 0;

    const typeInterval = setInterval(() => {
        element.value += text[i];
        i++;
        if (i === text.length) {
            clearInterval(typeInterval);
        }
    }, delay);
}

let extractedFilesFromZip = [];
let currentZipReader = null;
let currentZipEntries = [];

document.querySelector("#flash-file").addEventListener("change", async function () {
    const fileField = document.querySelector("#flash-file");
    const partField = document.querySelector(".flash-partition");
    const fileTable = document.querySelector("#file-table tbody");
    const selectAllCheckbox = document.getElementById("select-all-checkbox");

    fileTable.innerHTML = "";  // clear table
    extractedFilesFromZip = [];
    currentZipReader = null;
    currentZipEntries = [];

    let filesToShow = [];

    if (fileField.files.length === 0) {
        partField.value = "";
        partField.disabled = true;
        partField.placeholder = "Partition like - boot, dtbo, super, vendor_boot, recovery, etc.";
        updateSelectAllCheckbox();
        return;
    }

    function setPartitionCellEditable(row, editable) {
        const partitionCell = row.querySelector('td.editable-partition');
        const actuallyEditable = editable && !row.classList.contains('disabled');
        if (partitionCell) {
            partitionCell.setAttribute('contenteditable', actuallyEditable ? 'true' : 'false');
        }
    }

    function addFileRow(fileName, fileSize, isEditable) {
        const matchedPartition = fileMapping[fileName.toLowerCase()] || null;
        const editable = !matchedPartition;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${fileName}</td>
            <td contenteditable="${editable}" class="${editable ? 'editable-partition' : ''}">
                ${matchedPartition || "Enter Partition"}
            </td>
            <td>${fileSize}</td>
            <td><input type="checkbox" class="row-checkbox" checked /></td>
        `;
    setPartitionCellEditable(row, true);
    row.addEventListener("click", (e) => {
        if (e.target.classList.contains('row-checkbox')) return;
        const checkbox = row.querySelector('.row-checkbox');
        const partitionCell = row.querySelector('td.editable-partition');
        if (!checkbox.checked) {
            checkbox.checked = true;
            row.classList.remove('disabled');
            setPartitionCellEditable(row, true);
            updateSelectAllCheckbox();
            if (partitionCell && partitionCell.contains(e.target)) {
                partitionCell.focus();
            }
            e.preventDefault();
            e.stopPropagation();
        } else {
            if (partitionCell && partitionCell.contains(e.target)) {
                return;
            }
            checkbox.checked = false;
            row.classList.add('disabled');
            setPartitionCellEditable(row, false);
            updateSelectAllCheckbox();
        }
    });

    row.querySelector('.row-checkbox').addEventListener("change", function () {
        row.classList.toggle('disabled', !this.checked);
        setPartitionCellEditable(row, this.checked);
        updateSelectAllCheckbox();
    });
        fileTable.appendChild(row);
    }

    function updateSelectAllCheckbox() {
        if (!selectAllCheckbox) return;
        const rowCheckboxes = Array.from(fileTable.querySelectorAll(".row-checkbox"))
            .filter(cb => cb !== selectAllCheckbox);

        if (rowCheckboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            return;
        }
        const allChecked = rowCheckboxes.every(cb => cb.checked);
        const someChecked = rowCheckboxes.some(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = !allChecked && someChecked;
    }

    if (selectAllCheckbox && !selectAllCheckbox.hasSelectAllListener) {
        selectAllCheckbox.addEventListener("change", () => {
            const checked = selectAllCheckbox.checked;
            const rowCheckboxes = Array.from(fileTable.querySelectorAll(".row-checkbox"))
                .filter(cb => cb !== selectAllCheckbox);
            rowCheckboxes.forEach(cb => {
                if (cb.checked !== checked) {
                    cb.checked = checked;
                    cb.dispatchEvent(new Event('change'));
                }
            });
        });
        selectAllCheckbox.hasSelectAllListener = true;
    }

    const selectedFiles = Array.from(fileField.files);

    if (selectedFiles.length === 1 && selectedFiles[0].name.toLowerCase().endsWith(".zip")) {
        try {
            const zipFile = selectedFiles[0];
            currentZipReader = new zip.ZipReader(new zip.BlobReader(zipFile));
            currentZipEntries = await currentZipReader.getEntries();

            const allowedExt = ['img', 'mbn', 'elf', 'bin'];
            const maxSizeBytes = 9000 * 1024 * 1024; // 9000 MB

            const filteredEntries = currentZipEntries.filter(e => {
                const ext = e.filename.split('.').pop().toLowerCase();
                return allowedExt.includes(ext) && e.uncompressedSize <= maxSizeBytes;
            });

            if (filteredEntries.length === 0) {
                alert("No supported image files smaller than 9000MB found inside the ZIP!");
                return;
            }

            filteredEntries.forEach(entry => {
                const fileName = entry.filename.split('/').pop();
                const sizeFormatted = formatFileSize(entry.uncompressedSize || 0);
                addFileRow(fileName, sizeFormatted, true);
                filesToShow.push({ name: fileName });
            });
            
            if (filteredEntries.length > 1) {
                const someMatch = filteredEntries.some(entry => fileMapping[entry.filename.split('/').pop().toLowerCase()]);
                if (someMatch) {
                    const allRows = Array.from(fileTable.querySelectorAll("tr"));
                    allRows.forEach(row => {
                        const fileName = row.cells[0].textContent.trim().toLowerCase();
                        if (!fileMapping[fileName]) {
                            if (!row.classList.contains('disabled')) row.classList.add('disabled');
                            const cb = row.querySelector('.row-checkbox');
                            if (cb) cb.checked = false;
                            const partitionCell = row.cells[1];
                            if (partitionCell) partitionCell.setAttribute('contenteditable', 'false');
                        }
                    });
                }
            }

            partField.value = "";
            partField.disabled = true;
            partField.placeholder = "Enter partition in the table for multiple files";

        } catch (err) {
            alert("Failed to read ZIP file: " + err.message);
            return;
        }
    } else {
        selectedFiles.forEach(file => {
            const fileName = file.name;
            const sizeFormatted = formatFileSize(file.size);
            const matchedPartition = fileMapping[fileName.toLowerCase()];
            const isEditable = !matchedPartition;
            addFileRow(fileName, sizeFormatted, isEditable);
            filesToShow.push({ name: fileName, file });
        });

        if (selectedFiles.length > 1) {
            const someMatch = selectedFiles.some(file => fileMapping[file.name.toLowerCase()]);
            if (someMatch) {
                const allRows = Array.from(fileTable.querySelectorAll("tr"));
                allRows.forEach(row => {
                    const fileName = row.cells[0].textContent.trim().toLowerCase();
                    if (!fileMapping[fileName]) {
                        if (!row.classList.contains('disabled')) row.classList.add('disabled');
                        const cb = row.querySelector('.row-checkbox');
                        if (cb) cb.checked = false;
                        const partitionCell = row.cells[1];
                        if (partitionCell) partitionCell.setAttribute('contenteditable', 'false');
                    }
                });
            }
        }

        currentZipReader = null;
        currentZipEntries = [];

        if (selectedFiles.length > 1) {
            partField.value = "";
            partField.disabled = true;
            partField.placeholder = "Enter partition in the table for multiple files";
        } else {
            partField.value = "";
            partField.disabled = false;
            partField.placeholder = "Partition like - boot, dtbo, super, vendor_boot, recovery, etc.";
        }
    }

    if (filesToShow.length === 1) {
        const matchedPartition = fileMapping[filesToShow[0].name.toLowerCase()] || null;
        const firstRow = fileTable.querySelector("tr");
        if (!firstRow) return;
        const partitionCell = firstRow.cells[1];

        if (matchedPartition) {
            partField.value = "";
            typeAnimation(partField, matchedPartition, 50);
        } else {
            partField.value = "";
            partField.placeholder = "Partition like - boot, dtbo, super, vendor_boot, recovery, etc.";
        }

        partField.oninput = null;
        partitionCell.oninput = null;

        partField.addEventListener("input", (e) => {
            partitionCell.textContent = e.target.value;
        });
        partitionCell.addEventListener("input", (e) => {
            partField.value = partitionCell.textContent;
        });
    }
    updateSelectAllCheckbox();
});


async function flashFormFile(event) {
    event.preventDefault(); 
    toggleElements("all"); 

    const fileTable = document.querySelector("#file-table tbody");
    const allRows = fileTable.querySelectorAll("tr");
    const rows = Array.from(allRows).filter(row => row.querySelector('.row-checkbox')?.checked);
    const resultField = document.querySelector(".result-field");
    let slot = await device.getVariable("current-slot");

    if (rows.length === 0) {
        alert("Please select at least one file to flash!");
        toggleElements("all-enable");
        return;
    }

    const partitions = [];
    let hasError = false;

    rows.forEach((row) => {
        let partition = row.cells[1].textContent.trim();

        if ((slot === null || (slot !== "a" && slot !== "b")) && partition.endsWith("_ab")) {
            partition = partition.replace(/_ab$/, "");
        }

        if (!partition || partition === "Enter Partition" || partition === "Enter Partition in the table for multiple files") {
            row.cells[1].textContent = "Enter Partition";
            hasError = true;
        } else {
            partitions.push(partition);
        }
    });

    if (hasError) {
        alert("Error: Please enter valid partitions for all selected files in the table.");
        resetTableToPlaceholders();
        toggleElements("all-enable");
        return;
    }
    scrollToLogs();

    try {
        for (let i = 0; i < rows.length; i++) {
            const fileName = rows[i].cells[0].textContent;
            const partition = partitions[i];

            let fileBlob = null;

            if (currentZipReader && currentZipEntries.length > 0) {
                const entry = currentZipEntries.find(e => e.filename.endsWith(fileName));
                if (!entry) throw new Error(`File ${fileName} not found inside ZIP`);
                fileBlob = await entry.getData(new zip.BlobWriter());
            } else {
                const fileField = document.querySelector("#flash-file");
                const file = Array.from(fileField.files).find(f => f.name === fileName);
                if (!file) throw new Error(`File ${fileName} not found in input files`);
                fileBlob = file;
            }

            if (partition.endsWith("_ab")) {
                const partitionA = partition.replace("_ab", "_a");
                const partitionB = partition.replace("_ab", "_b");

                resultField.textContent = `Flashing ${fileName} to ${partitionA}...\n` + resultField.textContent;
                await device.flashBlob(partitionA, fileBlob, (progress) => {
                    resultField.textContent = `${partitionA} Progress: ${progress}%\n` + resultField.textContent;
                });
                resultField.textContent = `Successfully flashed ${fileName} to ${partitionA}.\n` + resultField.textContent;

                resultField.textContent = `Flashing ${fileName} to ${partitionB}...\n` + resultField.textContent;
                await device.flashBlob(partitionB, fileBlob, (progress) => {
                    resultField.textContent = `${partitionB} Progress: ${progress}%\n` + resultField.textContent;
                });
                resultField.textContent = `Successfully flashed ${fileName} to ${partitionB}.\n` + resultField.textContent;
            } else {
                resultField.textContent = `Flashing ${fileName} to ${partition}...\n` + resultField.textContent;
                await device.flashBlob(partition, fileBlob, (progress) => {
                    resultField.textContent = `${partition} Progress: ${progress}%\n` + resultField.textContent;
                });
                resultField.textContent = `Successfully flashed ${fileName} to ${partition}.\n` + resultField.textContent;
            }
        }

        alert("All files flashed successfully!");
    } catch (error) {
        alert(`Failed to flash: ${error.message}`);
    } finally {
        document.querySelector("#flash-file").value = "";
        const partField = document.querySelector(".flash-partition");
        partField.value = "";
        partField.disabled = true;
        toggleElements("all-enable");
        partField.placeholder = "Partition like - boot, dtbo, super, vendor_boot, recovery, etc.";
        document.querySelector("#file-table tbody").innerHTML = "";
        currentZipReader = null;
        currentZipEntries = [];
        await checkDeviceConnection();
    }
}

function resetTableToPlaceholders() {
    const fileTable = document.querySelector("#file-table tbody");
    const rows = fileTable.querySelectorAll("tr");
    rows.forEach(row => {
        const partitionCell = row.cells[1];
        if (!partitionCell.textContent.trim() || partitionCell.textContent.trim() === "Enter Partition") {
            partitionCell.textContent = "Enter Partition";
        }
    });
}

function logdownload() {
    const logOutput = document.getElementById('log-output').textContent.trim();
    if (logOutput === "") {
        alert("Log is empty LOL. Nothing to download! 😂");
        return;
    }
    const blob = new Blob([logOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arkt_fastboot_tool.log';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.querySelector(".connect-button").addEventListener("click", connectDevice);
document.querySelector(".command-form").addEventListener("submit", sendFormCommand);
document.querySelector(".reboot-main-button").addEventListener("click", () => {
const selectedValue = document.querySelector(".reboot-select").value;
if (rebootCommands[selectedValue]) {
    rebootCommands[selectedValue]();
} else {
    alert("Please select a valid reboot option.");
}
});
document.querySelector(".switchslot-button").addEventListener("click", switchSlot);
document.querySelector(".flash-form").addEventListener("submit", flashFormFile);
document.querySelector(".download-log-button").addEventListener("click", logdownload);
