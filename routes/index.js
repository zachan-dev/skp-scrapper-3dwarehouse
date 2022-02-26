const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const corsOptions = {
  origin: 'https://skp-scrapper-3dwarehouse.herokuapp.com/',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

const fetchModels = function(collection_id, collection_name, category) {
  const DOMAIN = "https://3dwarehouse.sketchup.com";
  const PAGE_URL = DOMAIN + "/collection/" + collection_id + "/" + collection_name;
  const BASE_URL = DOMAIN + '/warehouse/v1.0/entities';
  const ENTRIES_DICT = {};

  return axios.get(PAGE_URL)
    .then(function(response) {
      const $ = cheerio.load(response.data);
      const count = $('.tab-count:first').text().replace('(', '').replace(')', '');
      return count;
    })
    .then(function(count) {
      return axios.get(BASE_URL, {
          params: {
            "recordEvent": "false",
            "showBinaryMetadata": "true",
            "showAttributes": "true",
            "contentType": "3dw",
            "fq": "parentIds==" + collection_id + ";(subtype=exists=false,subtype=='')",
            "count": count,
            "offset": 0,
            "sortBy": "createTime DESC"
          },
          headers: {
            "Cookie": "whp_unique=19ceaeb8-2d7d-434c-bd77-d1a8e61d2080"
          }
      });
    })
    .then(function(response) {
      const data = response.data;
      const entries = data.entries;
      entries.forEach(function(entity) {
        const id = entity.id;
        const title = entity.title;
        const author = entity.creator.displayName;
        const author_id = entity.creator.id;
        const binaries = entity.binaries;
        let bot_lt, thumbnail_url = null;
        if (binaries.bot_lt) {
          bot_lt = binaries.bot_lt;
          thumbnail_url = bot_lt.contentUrl;
        }
        if (binaries.s20) {
          s20 = binaries.s20;
          download_url = s20.url;
        } else if (binaries.s19) {
          s19 = binaries.s19;
          download_url = s19.url;
        }

        const data = { 
          "id": id, 
          "title": title, 
          "author": author, 
          "author_id": author_id, 
          "thumbnail_url": thumbnail_url, 
          "download_url": download_url,
          "category": category
        };
        ENTRIES_DICT[id] = data;
      });
      return ENTRIES_DICT;
    })
};


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: '3D Warehouse Fetcher' });
});

/* POST add */
router.post('/models', cors(corsOptions), function(req, res, next) {
  fetchModels(req.body.collectionID, req.body.collectionTitle, req.body.collectionCategory)
  .then(function(entriesDict) {
    res.json(entriesDict);
  })
  .catch(function(err) {
    res.json({ error: err }, 400);
  });
});

module.exports = router;
