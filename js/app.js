var i = 0,text;
text = "Student";

function typing() {
    if(i<text.length){
        document.getElementById("subtitle").innerHTML += text.charAt(i);
        i++;
        setTimeout(typing, 50);
    }
}
typing();