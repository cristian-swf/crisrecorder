const { desktopCapturer, remote } = require('electron');
const { writeFile } = require('fs');
const {dialog}      = require('@electron/remote')

const videoElement  = document.querySelector('video');
const startBtn      = document.getElementById('startBtn');
const stopBtn       = document.getElementById('stopBtn');
const divsources    = document.getElementById('divsources');
const recordSound   = document.getElementById('sound');
var mediaRecorder;
var recorderChunks  = [];
var currentSelectedSource;

async function getVideoSources()
{
    //get video sources
    const inputSources = await desktopCapturer.getSources({types: ['window', 'screen']});

    //build radio buttons list with each video source
    let sc = '<div class="field"><div class="control">';
    
    inputSources.map(source => 
            {
                sc+='<label class="radio"> <input id="videoSource" class="radiobtn" type="radio" name="videoSource" value="' + source.id + '" ' + (source.id===currentSelectedSource?'checked':'') + '> ' + source.name + ' </label><br>';
            });
    
    sc = sc + "</div></div>";        

    divsources.innerHTML = sc;
}

//listen for clicks on radio buttons
document.getElementById("divsources").addEventListener('click', function (event) 
{
    if (event.target && event.target.matches("input[type='radio']")) 
    {
        selectSource(event.target.value);
    }
});

//when a video source is clicked
async function selectSource(source)
{
    currentSelectedSource = source;

    const constraints = 
    {
        audio: recordSound.checked?{ mandatory: { chromeMediaSource: 'desktop' } }:recordSound.checked,
        video: {
            mandatory: { 
                chromeMediaSource: 'desktop', 
                chromeMediaSourceId: source
            }
        }
    };

    console.log(constraints);

    //create the stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    videoElement.srcObject = stream;
    videoElement.play();

    //init recorder
    const options = {mimeType: 'video/webm; codecs=vp9'};
    mediaRecorder = new MediaRecorder(stream, options);

    //recorder event handling
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;

    //activate start recording button
    startBtn.classList.remove('is-hidden');
}

function handleDataAvailable(e)
{
    recorderChunks.push(e.data);
}

async function handleStop(e)
{
    //create blob
    const blob = new Blob(recorderChunks, 
        {
            type: 'video/webm; codecs=vp9'
        });

    //convert to buffer    
    const buffer = Buffer.from(await blob.arrayBuffer());

    //get save path
    const { filePath, canceled } = await dialog.showSaveDialog(
        {
            buttonLabel: 'Save video',
            defaultPath: `record_${Date.now()}.webm`
        });

    if(canceled)
    {
        alert('Video saving canceled!')
    }    
    else
    {
        console.log('Saving video to: ' + filePath);

        //save to file
        writeFile(filePath, buffer, () => alert('File saved!'));
        recorderChunks = [];
    }
}

//stop button click
stopBtn.onclick = e => 
{
    //stop recording
    mediaRecorder.stop();

    startBtn.classList.remove('is-danger');
    startBtn.innerText = 'Start recording';

    //hide stop button
    stopBtn.classList.add('is-hidden');
};

startBtn.onclick = e => 
{
  //start recording  
  mediaRecorder.start();

  startBtn.classList.add('is-danger');
  startBtn.innerText = 'Recording...';

  //hide stop button
  stopBtn.classList.remove('is-hidden');
};

//run on app launch
getVideoSources();
window.setInterval( () => getVideoSources(), 1000);