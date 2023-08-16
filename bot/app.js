function creative(inputString) {
    parts = inputString.split(', ');
    let result='';
    for (let i = 0; i < 3; i++){
        let randomIndex = Math.floor(Math.random() * parts.length);
        result=parts[randomIndex]+', '+result;
    }
    return result;
}

$(document).ready(function () {
    // Используем конфигурационные данные из config.js
    var ROLE_CONTENT = CONFIG.ROLE_CONTENT;
    var CREATIVITY=CONFIG.CREATIVITY;
    var ROLE_DETAILS=CONFIG.ROLE_DETAILS;
    var temp = CONFIG.TEMPERATURE;
    var IMAGE_SIZE = CONFIG.IMAGE_SIZE;
    let cards = JSON.parse(localStorage.getItem('cards')) || {};


    const IMAGE_STYLER = CONFIG.IMAGE_STYLER;

    var OPENAI_API_KEY = CONFIG.API_KEY;



    let db;
    const request = indexedDB.open("MycacheImage", 1);

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains("images")) {
            db.createObjectStore("images");
        }
    };

    request.onerror = function (event) {
        console.error("Error opening DB", event);
    };


    request.onsuccess = function (event) {//db
        db = event.target.result;

        
        //............. работа с картинками из кэша и запрос на генерацию при пустом кэше
        async function update_image(imgElement, query) {
            const transaction = db.transaction(["images"], "readonly");
            const imagesdb = transaction.objectStore("images");

            console.log("Trying to retrieve image with query:", query);  // Debug log

            const request = imagesdb.get(query);

            request.onerror = function (event) {
                console.log("Error db", event);
            };

            request.onsuccess = async function (event) {

                if (request.result) {
                    // console.log("found:",request.result);
                    imageData = request.result; // возвращаем данные картинки
                } else {
                    // console.log("NOT found - generating:");
                    imageData = await fetchImageimageBASE64(query); // возвращаем данные картинки
                    // console.log('imageData');

                    if (imageData) {
                        const transaction = db.transaction(["images"], "readwrite");
                        const imagesdb = transaction.objectStore("images");
                        imagesdb.put(imageData, query);
                    }
                    // console.log("NOT found - generating: done");
                }

                imgElement.attr({
                    'src': "data:image/png;base64," + imageData
                });
            };

            ///////////////



        }


        //............. получение ссылки или base64 на сгенерированные картинки
        async function fetchImageimageBASE64(query) {
            const url = "https://api.openai.com/v1/images/generations";
            const headers = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            };
            const body = JSON.stringify({
                "prompt": `style: ${IMAGE_STYLER}; main object: ${query}`,
                "n": 1,
                "response_format": "b64_json",
                "size": `${IMAGE_SIZE}`
            });

            let response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: body
            });
            //console.info({response});
            let json = await response.json()

            //console.info({json});
            let imagelink = json.data[0].b64_json;
            //console.info(imageData);

            return imagelink; // возвращаем ссылку картинки


        }

        ////////////

        function removeHighlightedSpans(html) {
            return html.replace(/<span class="highlighted">(.*?)<\/span>/gi, '$1');
        }
        function highlight(html, substring) {
            return html.replace(new RegExp(`>([^<]*)(${substring})([^>]*)<`, 'gi'), `>$1<span class="highlighted">$2</span>$3<`);
        }

        async function fetchGPTideas(query, cardnumber) {
            const url = "https://api.openai.com/v1/chat/completions";
            const headers = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            };
            const body = JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        "role": "system",
                        "content": ROLE_CONTENT.replace('{IDEANUMBER}', cardnumber)
                    },
                    {
                        "role": "user",
                        "content": query+' (с учетом таких особенностей:'+creative(CREATIVITY)+')'
                    }
                ],
                temperature: temp
            });

            //console.info('1 ', Date.now());
            let response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: body
            });
            //console.info('2 ', Date.now(), { response });
            let json = await response.json()

            //console.info({ json });

            let responseData = JSON.parse(json.choices[0].message.content);

            console.info('3 ', Date.now(), { responseData });
            if (responseData.ideas) ideas = responseData.ideas;
            else ideas = responseData;
            console.info('IDEAS = ', { ideas });

            return ideas; // возвращаем массив идей


        }
        async function fetchGPTtext(query, role, context) {
            const url = "https://api.openai.com/v1/chat/completions";
            const headers = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            };
            const body = JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        "role": "system",
                        "content": role + ' Описание карточки:' + context
                    },
                    {
                        "role": "user",
                        "content": query
                    }
                ],
                temperature: temp
            });

             
            let response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: body
            });

            let json = await response.json()

            let responseData = json.choices[0].message.content;

           
            return responseData; 
        }


        function displayCards() {
            $('#cards-container').empty();
            let sortedQueries = Object.keys(cards).sort((a, b) => {
                return Date.parse(cards[a].timestamp) - Date.parse(cards[b].timestamp);
            });
            //let blockid='block'+Math.floor(Math.random()*10000);

            sortedQueries.forEach(query => {
                if (cards[query].data && Array.isArray(cards[query].data)) {
                    let queryBlock = $('<div>').addClass('query-block');
                    let blockhead = $('<div class="blockhead">').html(
                        '<h3>' + query + '  <button class="moreideas" data="' + query + '">Ещё вариант!</button></h3>' +
                        '<p class="timestamp">' + cards[query].timestamp + '</p>'
                    );
                    queryBlock.append(blockhead);
                    cards[query].data.forEach(card => {

                        let imgid = 'img' + Math.floor(Math.random() * 10000);

                        let cardElement = $('<div>').addClass('card').data('card', card);
                        let imgElement = $('<img>').attr({
                            'src': 'placeholder.gif',
                            'title': card.image_prompt,
                            'id': imgid
                        });
                        update_image(imgElement, card.image_prompt)
                        // console.log('card.image_prompt = '+card.image_prompt);
                        // console.debug('card data = '+card);

                        let regenElement = $('<div class="regenimg">')
                            .html('<span class="regenimgbutton" data="' + imgid + '">Заменить картинку</span>');
                        cardElement.append(regenElement);

                        let titleElement = $('<h4>').text(card.name);
                        cardElement.append(imgElement, titleElement);

                        if (card.trends) {
                            let carddescElement = $('<p>').addClass('carddesc').text(card.trends);
                            cardElement.append(carddescElement);
                        }

                        queryBlock.append(cardElement);
                    });

                    $('#cards-container').prepend(queryBlock);
                }
            });
        }

        $('#search-input').on('keyup', function () {
            const searchTerm = $(this).val().toLowerCase();

            $('.query-block').each(function () {
                let blockVisible = false;
                $(this).html(highlight(removeHighlightedSpans($(this).html()), searchTerm));
                const blockText = $(this).text().toLowerCase();
                if (blockText.includes(searchTerm)) { blockVisible = true;}
                $(this).find('.card').each(function () {
                    const cardText = $(this).text().toLowerCase();
                    if (cardText.includes(searchTerm)) {
                        blockVisible = true;
                        /* $(this).html($(this).html().replace(/<span class="highlighted">([^<]+)<\/span>/g, '$1'));
                        $(this).find('*').each(function () {
                            $(this).html(highlight($(this).html(), searchTerm));
                        });*/

                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });

                if (blockVisible) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        });

        $('#generate-btn').click(function () {
            $('#input-form').show();
            $(this).hide();
        });

        async function makenewcards(cardnumber) {
            let user_querry = $('#query-input').val();

            // Показать индикатор ожидания
            $('#loading-indicator').show();
            // СКРЫЛИ ФОРМУ
            $('#input-form').hide();
            $('#generate-btn').hide();

            //запросили гпт
            let ideas = await fetchGPTideas(user_querry, cardnumber);

            if (ideas) {

                let datacards = ideas;
                let oldcardsJSON = await JSON.parse(localStorage.getItem('cards'));
                if (oldcardsJSON)
                    if (oldcardsJSON[user_querry]) {
                        console.log({ oldcardsJSON });
                        let oldcards = oldcardsJSON[user_querry];
                        datacards = ideas.concat(oldcards['data']);
                        console.log({ oldcards });
                    }

                console.log({ ideas });
                console.log({ datacards });

                cards[user_querry] = {
                    data: datacards,
                    timestamp: new Date().toLocaleString()
                };

                // Проверка добавления данных
                //console.log("Добавленные данные:", cards[user_querry]);

                localStorage.setItem('cards', JSON.stringify(cards));
                displayCards();

            }
            else { alert('Не получилось. Попробуете еще раз?'); console.error("Ответ API не содержит ожидаемых данных."); }

            $('#loading-indicator').hide();
            $('#generate-btn').show();

        }

        $('#submit-btn').click(function () { makenewcards(1); });

        $('#search-input').on('input', function () {
            let query = $(this).val().toLowerCase();
            searchCards(query);
        });




        $(document).on('click', '.moreideas', function (e) {
            let q = $(this).attr('data');
            console.log({ q });
            $('#query-input').val(q);
            makenewcards(1);
        });

        $(document).on('click', '.regenimgbutton', async function (e) {
            let id = $(this).attr('data');
            imgElement = $('#' + id);
            let q = imgElement.attr("title");
            console.log({ q });

            const transaction = db.transaction(["images"], "readwrite");
            const imagesdb = transaction.objectStore("images");

            imagesdb.delete(q);

            //localStorage.removeItem(q);
            imgElement.attr('src', "placeholder.gif");
            update_image(imgElement, q);
            e.stopPropagation();
        });

        async function updatedesc(id, querry, role, context)
        {
            let data=await fetchGPTtext(querry,role, context);
            $("#"+id+"").html(data);
            //$("#"+id+"").html(await fetchGPTtext(querry,role, context));
            console.log (querry+' = ',data);
        }

        $(document).on('click', '.card',async function () {
          
            let storedcards=localStorage.getItem('cards')
            storedcards
            let cardData = $(this).data('card');
            let detailsList = $('<ul>');
            for (let key in cardData) {
               
                if (!(key=='image_prompt')) {
                    let listItem = $('<li>').html('<b>' + NAMES[key] + '</b><br> <span id="'+key+'">' + cardData[key]+'</span>');
                    detailsList.append(listItem);
                }
            }

            $('#details-content').empty().append(detailsList);
            $('#details-modal').show();
           
            let gptlist = $('<ul>');
            for (let key in DETAILQUERRY) {
                let listItem = $('<li>').html('<b>' + NAMES[key] + '</b><br><span id="'+key+'"> <img src="placeholder.gif" width=32></span>');               
                gptlist.append(listItem);
                updatedesc(key, DETAILQUERRY[key], ROLE_DETAILS, JSON.stringify(cardData));
            }   
            
            $('#gpt-details-content').empty().append(gptlist);
           
        });

        $('#close-modal-btn').click(function () {
            $('#details-modal').hide();
        });

        displayCards();


    }; //db

});