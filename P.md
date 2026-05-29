## In analyze

scrape this for keyboard formats: https://rbscholtus.github.io/keycraft/

there are 2 types of keyboards, column stagger and row stagger you will need to account for that when you scrape. for example, https://rbscholtus.github.io/keycraft/layouts/snth.html is column stagger and https://rbscholtus.github.io/keycraft/layouts/qwerty.html is row stagger, find the difference in their layouts when you scrape.

then scrape this for the the keywords list:

https://github.com/monkeytypegame/monkeytype/blob/master/frontend/static/languages/english_1k.json
https://github.com/monkeytypegame/monkeytype/blob/master/frontend/static/languages/english_5k.json
https://github.com/monkeytypegame/monkeytype/blob/master/frontend/static/languages/english_10k.json

the idea is this, in analyze, we scrape for the keyboard formats and keywords list

then we take the average typical hand size of a human, then we analyze them, if they had perfect form, and with human timing and limitations (full simulation as close the realistic as possible), we simulate how well the roll per keyboard format is and the theoretical HUMAN limit for each. find research papers and anything to help you to get the most accurate prediction.

## In display

build a beautiful modern 3d (three.js) website that shows the keys and their stats, the stats are precomputed in analyze and copied over the a specific folder, where all we do is display the information (static).

the user can compare formats, see the diff/gain etc.

research anything that a keyboard format enthusiast may find useful, and display it, along with simple terms to explain what that is and how to quantify it, however, the simulation is still most useful stat for me.