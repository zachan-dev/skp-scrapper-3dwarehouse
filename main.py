import requests
import urllib.parse
import MySQLdb
import sys
from bs4 import BeautifulSoup

db = MySQLdb.connect("localhost", "zach", "zach", "nft_world_architecture", charset='utf8' )
cursor = db.cursor()

DOMAIN = "https://3dwarehouse.sketchup.com"
# PAGE_URL = DOMAIN + "/search/?q=Colonial architecture&searchTab=model&domain=Architecture"
COLLECTION_ID = sys.argv[1] #'92fb0fe8ce6f4af6b9512bf9d58cea8d'
COLLECTION_NAME = sys.argv[2] #'東方文化之建築風格'
CATEGORY = sys.argv[3]
PAGE_URL = DOMAIN + "/collection/" + COLLECTION_ID + "/" + COLLECTION_NAME
BASE_URL = DOMAIN + '/warehouse/v1.0/entities'
DATADICT = {}
# QUERY = "Art Nouveau"

# Web scrape page to get entity counts
page = requests.get(PAGE_URL)
soup = BeautifulSoup(page.content, "html.parser")
# count = soup.find(class_="search-result-count").get_text().split()[0].replace("(", "").replace(")", "")
count = soup.find(class_="tab-count").get_text().replace("(", "").replace(")", "")
print(count)

# API call to retrieve all entity IDs of the query
# params = {
#     "count": 1,
#     "recordEvent": "false",
#     "offset": 0,
#     "q": QUERY,
#     "fq": "attribute:categories:domain:string==\"Architecture\";(attribute:3dw:isProduct:boolean==false,attribute:3dw:isProduct:boolean=exists=false)",
#     "sortBy": "popularity DESC",
#     "showBinaryMetadata": "true",
#     "showAttributes": "true",
#     "showBinaryAttributes": "true",
#     "contentType": "3dw"
# }
params = {
    "recordEvent": "false",
    "showBinaryMetadata": "true",
    "showAttributes": "true",
    "contentType": "3dw",
    "fq": "parentIds==" + COLLECTION_ID + ";(subtype=exists=false,subtype=='')",
    "count": count,
    "offset": 0,
    "sortBy": "createTime DESC"
}
url = BASE_URL + '?' + urllib.parse.urlencode(params)

headers = {
  'Cookie': 'whp_unique=19ceaeb8-2d7d-434c-bd77-d1a8e61d2080'
}

response = requests.request("GET", url, headers=headers)

entries = response.json().get('entries')
for entry in entries:
    id = entry.get('id')
    title = entry.get('title')
    author = entry.get('creator').get('displayName')
    author_id = entry.get('creator').get('id')
    binaries = entry.get('binaries')
    if binaries.get('bot_lt'):
        bot_lt = binaries.get('bot_lt')
        thumbnail_url = bot_lt.get('contentUrl')
    if binaries.get('s20'):
        s20 = binaries.get('s20')
        download_url = s20.get('url')
    elif binaries.get('s19'):
        s19 = binaries.get('s19')
        download_url = s19.get('url')

    # # API call to retrieve individual entity metadata
    # entity_url = BASE_URL + '/' + id

    data = { 
        "id": id, 
        "title": title, 
        "author": author, 
        "author_id": author_id, 
        "thumbnail_url": thumbnail_url, 
        "download_url": download_url,
        "category": CATEGORY
    }
    sql = """INSERT INTO entities(id,
         title, author, author_id, thumbnail_url, download_url, category)
         VALUES ("{id}", "{title}", "{author}", "{author_id}", "{thumbnail_url}", "{download_url}", "{category}")""".format(**data)
    try:
        cursor.execute(sql)
        db.commit()
    except Exception as e:
        print(e)
        # Rollback in case there is any error
        db.rollback()
    
    DATADICT[id] = data

#print(DATADICT)

print("--------------------------------")