function loadAlbumPhotos(albumName) {
    fetch(`/api/photos/${albumName}/image`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            let galleryContainer = document.getElementById("photo_album-1");
            galleryContainer.innerHTML = ""; // 清空相簿內容

            if (!galleryContainer.classList.contains("row")) {
                galleryContainer.classList.add("row");
            }

            data.forEach(photo => {
                let imgElement = document.createElement("img");
                imgElement.src = photo.file_path;
                imgElement.alt = "活動照片";
                imgElement.classList.add("w-100", "rounded");

                let imgWrapper = document.createElement("div");
                imgWrapper.classList.add("col-6", "col-md-4", "col-lg-3", "mb-3", "photo_album-xl");
                imgWrapper.appendChild(imgElement);

                galleryContainer.appendChild(imgWrapper);
            });

            console.log(`✅ 已成功載入 ${data.length} 張圖片`);
        })
        .catch(error => {
            console.error("❌ 圖片載入失敗:", error);
        });
}

document.addEventListener("DOMContentLoaded", function () {
    let albumSection = document.querySelector(".photo_album-section");
    if (!albumSection) return;

    let albumName = albumSection.getAttribute("data-album");
    let photoName = albumSection.getAttribute("data-photo");

    if (!albumName) {
        console.warn("⚠️ 沒有指定相簿名稱，無法載入相簿圖片");
        return;
    }
    if (!photoName) {
        console.warn("⚠️ 沒有指定照片名稱，無法載入指定圖片");
        return;
    }

    console.log(`📷 載入相簿: ${albumName}`);
    console.log(`🖼️ 載入指定照片: ${photoName}`);

    // 取得指定的兩張照片
    fetch(`/api/photos/${albumName}/photo/${photoName}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(photoData => {
            let mainPhoto = document.getElementById("main-photo");
            let swiperPhoto = document.getElementById("swiper-photo");

            if (mainPhoto) {
                mainPhoto.src = photoData.file_path;
            }
            if (swiperPhoto) {
                swiperPhoto.src = photoData.file_path;
            }

            console.log("✅ 主要圖片載入成功！");
        })
        .catch(error => console.error("❌ 主要圖片載入失敗:", error));

    // 取得所有相簿圖片
    fetch(`/api/photos/${albumName}/count`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(countData => {
            if (countData.total > 0) {
                loadAlbumPhotos(albumName);
            } else {
                console.warn("⚠️ 這個相簿沒有圖片");
            }
        })
        .catch(error => console.error("❌ 無法獲取相簿圖片數量:", error));
});
