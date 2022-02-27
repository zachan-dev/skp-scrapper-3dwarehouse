var Bluebird = Promise.noConflict();

const showMessage = (message) => {
    $('#console').text(message);
};

const download = (urlO) => {
    return fetch("/publiccontent/" + urlO.download_id)
    .then(resp => {
        return {
            id: urlO.id,
            blob: resp.blob()
        }
    });
};
const downloadByGroup = (urlOs, files_per_group=5) => {
    var count = 0;
    return Bluebird.Promise.map(
      urlOs, 
      async urlO => {
        const blobO = await download(urlO);
        showMessage('Downloaded ' + ++count + ' of ' + urlOs.length);
        return blobO;
      },
      {concurrency: files_per_group}
    );
}
const exportZip = blobOs => {
    var count = 0;
    const zip = new JSZip();
    blobOs.forEach((blobO, i) => {
      showMessage('Zipping ' + ++count + ' of ' + blobOs.length);
      zip.file(`model_${blobO.id}.skp`, blobO.blob);
    });
    showMessage('Zipping the files');
    zip.generateAsync({type: 'blob'}).then(zipFile => {
      showMessage('Zipped and exporting to your browser');
      const currentDate = new Date().getTime();
      const fileName = `models_${currentDate}.zip`;
      showMessage('Console is ready');
      return saveAs(zipFile, fileName);
    });
}
const downloadAndZip = urlOs => {
    showMessage('Downloaded 0 of ' + urlOs.length);
    return downloadByGroup(urlOs, 5).then(exportZip);
}

$('#multi-download-btn').click(function(e){
    e.preventDefault();
    var urlOs = [];
    $(".download_url").each((i, url) => {
      urlOs.push({
          "id": $(url).data("id"),
          "download_id": $(url).data("download_id"),
          "url": $(url).attr('href')
      });
    });
    console.log(urlOs);
    downloadAndZip(urlOs);
});

$('#add-models-form').submit(function(e) {
    e.preventDefault();
    // get all the inputs into an array.
    var $inputs = $('#add-models-form :input');

    // not sure if you wanted this, but I thought I'd add it.
    // get an associative array of just the values.
    var values = {};
    $inputs.each(function() {
        values[this.name] = encodeURI($(this).val());
    });
    fetch("/models", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
    }).then(function(response) {
        return response.json();
    }).then(function(dataDict) {
        entriesDict = {...entriesDict, ...dataDict};
        $('.card').remove();
        $('#current_count').text(0);
        for (const [id, entry] of Object.entries(entriesDict)) {
            var card = $('<li>', {
                class: "card col-md-4",
                data: { id }
            })
            var thumbnail = $('<div>', {
                class: "thumbnail"
            });
            var closeBtn = $('<a>', {
                class: "close",
                text: "x"
            });
            var img = $('<img>', {
                src: entry.thumbnail_url,
                class: 'img-responsive',
            });
            var downloadUrl = $('<a>', {
                class: "download_url",
                href: entry.download_url,
                data: { id, download_id: entry.download_id },
                text: "Download",
                download: "model_" + id + ".skp"
            }); 
            var title = $('<h4>', {
                class: "title"
            });
            var abbr = $('<abbr>', {
                title: entry.title,
                text: entry.title
            });
            var author = $('<p>', {
                text: entry.author
            });
            var category = $('<p>', {
                text: "Category: " + entry.category
            });
            title.append(abbr);
            thumbnail.append(closeBtn);
            thumbnail.append(img);
            thumbnail.append(downloadUrl);
            thumbnail.append(title);
            thumbnail.append(author);
            thumbnail.append(category);
            card.append(thumbnail);
            $('#cards').append(card);
        }
        
        $('#current_count').text(Object.keys(entriesDict).length);
        $('.close').click(function(){
            var $target = $(this).parents('li');
            delete entriesDict[$target.data('id')];
            $target.hide('slow', function(){ $target.remove(); });
            $('#current_count').text(Object.keys(entriesDict).length);
        });
    }).catch(function(err) {
        console.error(err);
    });
});