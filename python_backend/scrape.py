import os
import requests
from PIL import Image
from io import BytesIO
import hashlib
import time

# --------------------------
# CONFIGURATION
# --------------------------
API_KEY = "YOUR_BING_API_KEY"
ENDPOINT = "https://api.bing.microsoft.com/v7.0/images/search"

SAVE_DIR = "data/negative/"
NUM_IMAGES = 300   # how many negative images to fetch

NEGATIVE_QUERIES = [
    "neutral face portrait",
    "blank expression face",
    "calm face person",
    "ordinary person portrait",
    "no expression face",
    "face looking straight",
]

os.makedirs(SAVE_DIR, exist_ok=True)

def bing_search(query, count=50, offset=0):
    headers = {"Ocp-Apim-Subscription-Key": API_KEY}
    params = {
        "q": query,
        "count": count,
        "offset": offset,
        "imageType": "Photo",
        "safeSearch": "Strict"
    }
    response = requests.get(ENDPOINT, headers=headers, params=params)
    response.raise_for_status()
    return response.json()["value"]

def download_image(url, save_directory):
    try:
        img_data = requests.get(url, timeout=5).content
        img = Image.open(BytesIO(img_data))

        # reject small or invalid images
        if img.width < 80 or img.height < 80:
            return False

        # use hash to avoid duplicates
        h = hashlib.md5(img_data).hexdigest()
        filename = os.path.join(save_directory, f"{h}.jpg")

        if not os.path.exists(filename):
            img.save(filename)
            return True
        else:
            return False
    except:
        return False

def fetch_negative_faces():
    total_downloaded = 0

    for query in NEGATIVE_QUERIES:
        offset = 0

        while total_downloaded < NUM_IMAGES:
            results = bing_search(query, count=50, offset=offset)
            if not results:
                break

            for item in results:
                url = item.get("contentUrl")
                if not url:
                    continue

                if download_image(url, SAVE_DIR):
                    total_downloaded += 1
                    print(f"Downloaded {total_downloaded}/{NUM_IMAGES}")

                if total_downloaded >= NUM_IMAGES:
                    break

            offset += 50
            time.sleep(1)  # polite to API

    print("Done!")

if __name__ == "__main__":
    fetch_negative_faces()
