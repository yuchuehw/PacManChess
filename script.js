function main(){
  // switches! feel free to change these to false.
  const yojay_mode = true
  const capture_own_piece = false
  let legal_move = true

  //base board config.
  const board_config = {
    draggable: true,
    pieceTheme: pieceTheme,
    onDrop: check_move,
    onDragStart:onDragStart,
    onDragMove:onDragMove,
    onMouseoverSquare:onMouseoverSquare
  }
  
  let board = Chessboard('board', board_config)

  sq = null

  //preloading image for showing legal move purpose
  //@#%&*+
  let preloaded = {};
  ["wK","wQ","wR","wB","wN","wP","bK","bQ","bR","bB","bN","bP",
   "yK","yQ","yR","yB","yN","yP","blank"].forEach(a => {
    preloaded[a] = new Image();preloaded[a].src = "assets/chesspiece/"+a+".png";
  })

  //audio file for move sound
  const audio = new Audio("assets/sound/move.mp3")

  //css style sheet manipulation. for move highlighting and movelist bolding.
  const style = document.createElement("style");
  document.head.appendChild(style);

  //chess piece is ascii character
  const chess_piece_ascii = {"wK":"♔","wQ":"♕","wR":"♖","wB":"♗","wN":"♘","wP":"♙",
  "bK":"♚","bQ":"♛","bR":"♜","bB":"♝","bN":"♞","bP":"♟︎"}
  
  //jquery land!
  $('#previous').on('click', previous)
  $('#next').on('click', next)
  $('#restart').on('click', restart)
  $('#legal-move').on('click', mod_legal)
  $('#mode-switch').on('click', mode_switcher)
  $('#remove-arrow').on('click', clear_arrow)
  "abcdefgh".split("").forEach(f => {for(let r = 1;r<9;r++){
    $('.'+"square-"+f+r).on('touchstart', {param1: f+r}, f1)
  }})
  let play_move = false
  let rewind_move = false
  //event listner. yeah i know ewww
  document.addEventListener("keydown", (event) => {
    if(prevent_interupt_promotion()){
    }else if(event.key === "ArrowUp"){
      play_move = false
      rewind_move = false
      seek(0)
    }
    else if(event.key === "ArrowLeft"){
      play_move = false
      rewind_move = false
      seek(null,-1)
    }else if(event.key === "ArrowDown"){
      play_move = false
      rewind_move = false
      seek(positions.length-1)
    }else if(event.key === "ArrowRight"){
      play_move = false
      rewind_move = false
      seek(null,1)
    }else if(event.key === "p"){
      rewind_move = false
      play_move = !play_move
      if(play_move){
        play_move_function()
      }
    }else if(event.key === "r"){
      play_move = false
      rewind_move = !rewind_move
      if(rewind_move){
        rewind_move_function()
      }
    }
    
  });
  function play_move_function(){
    if(play_move === true && position_index != positions.length-1) {
      if(position_index != positions.length-2){
        window.setTimeout(play_move_function, 300)  
      }
      seek(null,1) 
    }
  }
  function rewind_move_function(){
    if(rewind_move === true && position_index != 0) {
      if(position_index != 1){
        window.setTimeout(rewind_move_function, 300)  
      }
      seek(null,-1)
    }
  }
  
  let mode = true // move making mode
  let click_in_action = false
  let moused_square = null
  let arrows = []
  let current_arrow = []
  
  window.oncontextmenu = function ()
  {
    return false;     // cancel default menu
  }

  
  document.getElementById("board").onmousedown = function (e) {
    click_in_action = !mode ? true : false
  }
  
  let permission = false
  document.getElementById("board").onmouseup = function (e) {
    if(permission){
      save_arrow(current_arrow)
      permission = false      
    }
  }

  function save_arrow(current_arrow){
    let match = null
    for(let i=0;i<arrows.length;i++){
      if(array_is_same(arrows[i],current_arrow)){
        match = i
        break
      }
    }
    if(match != null){
      arrows.splice(match, 1)
      remove_arrow()
      arrows.forEach(arrow => drawArrow(...arrow));
      current_arrow = null
    }else if(current_arrow){
      arrows.push(current_arrow)
      remove_arrow()
      arrows.forEach(arrow => drawArrow(...arrow));
      current_arrow = null
    }
    click_in_action = false
  }

  
  //list for rendering legal move
  let special_render = []
  
  //move list in fen notation
  let positions = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"]
  position_index = 0
  
  //castlling variables
  let k_list = ["e8", "e1"]
  let wr_list = ["a1", "h1"]
  let br_list = ["a8","h8"]

  //turn: keep track of who's turn it was false is white true is black
  let turn = false
  
  //en passant opportunities. when ANY pawn move two square the square it crossed (rank3/6) is added to the string.
  let en_passant = ""
  
  //prevent promotion screen to be interrupted.
  let promotion = null
  
  //supporting click move
  let temp_piece = null
  let temp_square = null
  let temp_object = null
  let first_drag = false
  
  //this is useful for legal move highlighting.
  let allowed = false

  //fire when restart is clicked. reset all variable.  
  function restart(){
    special_render = []
    
    positions = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"]
    position_index = 0
    
    k_list = ["e8", "e1"]
    wr_list = ["a1", "h1"]
    br_list = ["a8","h8"]
    
    turn = false
    
    en_passant = ""

    promotion = null
    
    rm_temp()
    
    //clear all moves from movelist.
    document.querySelectorAll('.move-row').forEach(e => e.remove());
    
    board = Chessboard('board', board_config)
    "abcdefgh".split("").forEach(f => {for(let r = 1;r<9;r++){
    $('.'+"square-"+f+r).on('touchstart', {param1: f+r}, f1)
  }})
    
    board.position(positions[0])
  }
  
  // pieceTheme
  // piece rendering and thing. mapping piece to their actual image file.
  function pieceTheme (piece) {
    //conversion between transparent piece and actual piece they represent
    const conversion1 = ["@","#","%","&","*","+"]
    const conversion2 = ["K","Q","R","B","N","P"]
    
    //if piece name is number they are piece that require special rendering
    if(piece[1] >= '0' && piece[1] <= '9'){
      const index = Number(piece[1])
      if(piece.length == 3){
        index = Number(piece[1]+piece[2])        
      }
      const imageObj1 = preloaded[special_render[index][0]]
      const yellow_piece = "y"+conversion2[conversion1.indexOf(special_render[index][1][1])]
      const imageObj2 = legal_move ? preloaded[yellow_piece] :preloaded["blank"]

      return piece_image_factory(imageObj1, imageObj2)
    }else if(conversion1.includes(piece[1])){
      const yellow_piece = legal_move ? "y"+conversion2[conversion1.indexOf(piece[1])] : "blank"
      return 'assets/chesspiece/' + yellow_piece + '.png'
    }
    return 'assets/chesspiece/' + piece + '.png'
  }

  //continuos of piece rendering
  function piece_image_factory(imageObj1, imageObj2){
    let c=document.createElement("canvas");
    c.width = 80; //or other value
    c.height = 80; //or other value
      
    let ctx=c.getContext("2d");
    ctx.drawImage(imageObj1, 0, 0, 80, 80);
    ctx.drawImage(imageObj2, 0, 0, 80, 80);
      
    const img = c.toDataURL("image/png");
    return img
  }

  //onDragStart
  //prevent incorrect color piece from beling dragged
  //give temporary highlight to drag piece
  //show legal move when drag piece
  function onDragStart(start_square, piece) {
    if(!mode){
      return false
    }
    if(position_index != positions.length-1){
      seek(positions.length-1)
      return false
    }

    //grant acess to choose promotion piece despite technically being the "wrong color"
    if(promotion){
      return
    }

    if(piece[1] >= "0" && piece[1] <= "9"){
      if(piece[0] == "w" && turn){
        check_move(start_square,start_square)
        return false
      }else if (piece[0] == "b" && !turn){
        check_move(start_square,start_square)
        return false
      }
      allowed = true
      return true
    }
    else if(piece[1].toLowerCase() == piece[1] && piece[1]){
      check_move(start_square,start_square)
      return false
    }
    
    if(piece[0] == "w" && piece[1].toLowerCase() != piece[1] && turn){
      return false
    }else if(piece[0] == "b" && piece[1].toLowerCase() != piece[1] && !turn){
      return false
    }
    
    const p_type = piece[1]          
    const f0 = start_square[0]
    const f0_n = f0.charCodeAt(0)
    const r0 = Number(start_square[1])
    let pos = board.position()
    
    //highlight draged piece square and show legal move
    if((!first_drag && !temp_square)){
      first_drag = true
      el = document.getElementsByClassName("square-"+start_square)[0]
      el.classList.add("temporary")
      temp_square = start_square
      temp_piece = piece
      temp_object = el
      label_legal_move(pos,p_type,f0_n,r0,turn)
    }
  }

  //sibling function for onDragStart. Handle weird scanario
  function onDragMove (end_square,_,start_square,
                     piece, position, orientation) {
    if(piece[1] >= "0" && piece[1] <= "9" && allowed){
      allowed = false
      SB()
      if(piece.length == 2){
        piece = special_render[Number(piece[1])][0]        
      }else{
        piece = special_render[Number(piece[1]+piece[2])][0]
      }
      const p_type = piece[1]          
      const f0 = start_square[0]
      const f0_n = f0.charCodeAt(0)
      const r0 = Number(start_square[1])
      let pos = board.position()
      pos[start_square] = piece
      //highlight draged piece square and show legal move
      if(!first_drag && !temp_square){
        first_drag = true
        el = document.getElementsByClassName("square-"+start_square)[0]
        el.classList.add("temporary")
        temp_square = start_square
        temp_piece = piece
        temp_object = el
        label_legal_move(pos,p_type,f0_n,r0,turn)
      }
    }
    //if attempt to drag a different piece this fires!
    if(temp_square && start_square != temp_square && piece[1] >= "A" && piece[1] <= "Z"){ 
      SB()
      const p_type = piece[1]          
      const f0 = start_square[0]
      const f0_n = f0.charCodeAt(0)
      const r0 = Number(start_square[1])
      let pos = board.position()
      first_drag = true
      el = document.getElementsByClassName("square-"+start_square)[0]
      el.classList.add("temporary")
      temp_square = start_square
      temp_piece = piece
      temp_object = el
      label_legal_move(pos,p_type,f0_n,r0,turn)
    }                  
  }

  //label legal move duhh.
  function label_legal_move(pos,p_type,f0_n,r0,turn){
    //inner function. ewww. this is just use so many times.
    //check if position is open.
    const color = turn ? "b" : "w"
    
    function check_square_in_board(f1,r1,pic_dir){
      if(f1 >= "a" && f1 <= "h" && r1 >= 1 && r1 <= 8){
        const square_ = f1+r1
        if(pos[square_] && pos[square_][0] == color && !capture_own_piece){
          
        }
        else if(pos[square_]){
          special_render.push([pos[square_],pic_dir])
          pos[square_] = pos[square_][0]+(special_render.length-1)
          return true
        }else{
          pos[square_] = pic_dir
          return false
        }
      }
      return true
    }

    
    special_render = []
    const pawn_rules = [[2,4,3,1,5],[7,5,6,-1,4]]
    const r = pawn_rules[Number(turn)]
    if(p_type == "P"){
      const f0 = String.fromCharCode(f0_n)
      if(r0 == r[0] && !pos[f0+r[1]] && !pos[f0+r[2]]){
        pos[f0+r[1]] = "w+"
      }
      if(!pos[f0+(r0+r[3])]){
        pos[f0+(r0+r[3])] = "w+"
      }
      const diag1 = String.fromCharCode(f0_n+1) + (r0+r[3])
      const diag2 = String.fromCharCode(f0_n-1) + (r0+r[3])
      
      if(en_passant == diag1){
        pos[diag1] = "w+"
      }
      else if(pos[diag1] && (pos[diag1][0] != color || capture_own_piece)){
        special_render.push([pos[diag1],"w+"])
        pos[diag1] = pos[diag1][0]+(special_render.length-1)
      }
      
      if(en_passant == diag2){
        pos[diag2] = "w+"
      }
      else if(pos[diag2] && (pos[diag2][0] != color || capture_own_piece)){
        special_render.push([pos[diag2],"w+"])
        pos[diag2] = pos[diag2][0]+(special_render.length-1)
      }
      

    }else if(p_type == "K" || p_type == "N"){
      const move_rules = (p_type == "N") ? [2,-3,1,"w*"] : [1,-2,0,"w@"]
      //if king check 8 square around him
      //if knight check 24 square around him
      for(let i=move_rules[0];i>move_rules[1];i--){
        for(let j=move_rules[0];j>move_rules[1];j--){
          // king must not move horizontally by 0 and vertically by 0
          if(!move_rules[2] && i == j && i == 0){continue}
          // knight's horizontal + vertical must equal to 3
          if(move_rules[2] && Math.abs(i)+Math.abs(j) != 3){continue}
          f1 = String.fromCharCode(f0_n+i)
          r1 = r0+j
          // check if move is on the board and annotate it.
          check_square_in_board(f1,r1,move_rules[3])
        }
      }
    }
    // horizontal and vertical moving pieces.
    else if(p_type == "R" || p_type == "Q"){
      const img_file = p_type == "Q" ? "w#" : "w%";
      //check left, right, up, down. bascially. not in that order.
      [[1,8,1,0,0,0],[-1,-8,-1,0,0,0],[0,0,0,1,8,1],[0,0,0,-1,-8,-1]].forEach(mr => {
        for(let i=mr[0],j=mr[3];i != mr[1] || j != mr[4];i+=mr[2],j+=mr[5]){
          const f1 = String.fromCharCode(f0_n+i)
          const r1 = r0+j
          _ = check_square_in_board(f1,r1,img_file)
          if(_){break}
        }        
      })

    }
    
    //diagonal pieces
    if(p_type == "B" || p_type == "Q"){
      const img_file = p_type == "Q" ? "w#" : "w&";
      //left-up right-up left-down right-down. not in that order.
      [[1,8,1,1,8,1],[1,8,1,-1,-8,-1],[-1,-8,-1,1,9,1],[-1,-8,-1,-1,-8,-1],].forEach(mr => {
        for(let i=mr[0],j=mr[3];i != mr[1];i+=mr[2],j+=mr[5]){
          const f1 = String.fromCharCode(f0_n+i)
          const r1 = r0+j
          _ = check_square_in_board(f1,r1,img_file)
          if(_){break}
        }        
      })

    //check for castling
    }else if(p_type == "K" && k_list.includes(String.fromCharCode(f0_n)+r0)){
      const pic_dir = "w@";
      [[1,8,1,0,0,0],[-1,-8,-1,0,0,0],[0,0,0,1,8,1],[0,0,0,-1,-8,-1]].forEach(mr => {
        for(let i=mr[0]+mr[2],j=mr[3]+mr[5];i != mr[1] || j != mr[4];i+=mr[2],j+=mr[5]){
          const f1 = String.fromCharCode(f0_n+i)
          const r1 = r0+j
          const rook_list = turn ? br_list :wr_list
          if(rook_list.includes(f1+r1)){
            square_ = String.fromCharCode(f0_n+mr[2]*2)+(r0+mr[5]*2)
            if(pos[square_]){
              special_render.push([pos[square_],pic_dir])
              pos[square_] = pos[square_][0]+(special_render.length-1)
              return true
            }else{
              pos[square_] = pic_dir
              return false
            }
          }else if(pos[f1+r1] && pos[f1+r1][0] == color && !capture_own_piece){
            break
          }
        }        
      })

    }
    board.position(pos)
  }
  
  //most important function of all.
  //it is so long they need to send me to jail for this.
  function check_move(start_square, end_square, piece, start_pos, end_pos, orientation){
    if(start_square == end_square && first_drag){
      first_drag = false
      return "snapback"
    }
    
    //correct the piece. this is a patch. do not touch.
    if(piece && piece[1] >= "0" && piece[1] <= "9"){
      if(start_square != end_square){
        _ = board.position()
        piece = _[start_square]
      }else{
        if(piece.length == 2){
          piece = special_render[Number(piece[1])][0]        
        }else{
          piece = special_render[Number(piece[1]+piece[2])][0]
        }  
      }
      
    }
    //initiallizing useful variable
    pos = board.position()

    //ignore and remove all the legal move highlights
    const legal_moves = remove_garbage(pos)

    //handle promotion screen
    if(promotion){
      promotion_handler(piece)      
      return "trash"
    }
    
    //[MOVED: handle attempt move piece when viewing old move to OnDragStart]
    
    //handle clicking start and end square instead of dragging.
    if(start_square == end_square){
      if(first_drag){
        first_drag = false
        return "snapback"
      }else if(temp_piece){
        temp_object.classList.remove("temporary")
        if(temp_square != start_square){
          piece = temp_piece
          end_square = start_square
          start_square = temp_square
        }else{
          return SB()         
        }
      }
    }
    
    if(!legal_moves.includes(end_square)){
       return SB() 
    }
    //great you made a legal move. now what. update position?
    
    update_position(pos,start_square,end_square,piece)

    //remove highlights caused by dragging.
    rm_temp()
    sound_effect()
    
    //make the opposite color be able to move for next move
    turn = !turn
    return "snapback"
  }
  
  //this is still way too long. fix later.
  function update_position(pos,start_square,end_square,piece){
    const original_piece = piece
    let capture = false 
    if(pos[end_square]){
      piece = piece[0]+pos[end_square][1]
      capture = true
    }
    delete pos[start_square]
    const f0 = start_square[0]
    const f0_n = f0.charCodeAt(0)
    const r0 = Number(start_square[1])
    const f1 = end_square[0]
    const f1_n = f1.charCodeAt(0)
    const r1 = Number(end_square[1])
    const f_diff = f0_n-f1_n
    const r_diff = r0-r1
    let kc = false
    
    if(original_piece[1] == "K" && f_diff != 1 && f_diff != -1 && r_diff != 1 && r_diff != -1){
      attempt_castle(pos,original_piece,f0_n,r0,-f_diff/2,-r_diff/2)
      kc = true
    }
    else if(original_piece == "wP" && end_square == en_passant){
      pos[end_square] = piece
      delete pos[end_square[0]+5]
    }
    else if(original_piece == "bP" && end_square == en_passant){
      pos[end_square] = piece
      delete pos[end_square[0]+4]
    }
    else if(original_piece != piece && yojay_mode){
      pos[end_square] = piece
      
    }else{
      pos[end_square] = original_piece
    }
    board.position(pos, false)
    positions.push(board.position("fen"))
    position_index += 1
    
    //handle pawn promotion
    if(piece === "wP" && end_square[1] === "8"){
      board.position("8/8/8/3QR3/3BN3/8/8/8 w")
      promotion = end_square
    }else if(piece === "bP" && end_square[1] === "1"){
      board.position("8/8/8/3qr3/3bn3/8/8/8 w")
      promotion = end_square
    }

    //handle new king and rook spawning
    if(piece != original_piece){
      if(piece === "wK" || piece === "bK"){
        k_list.push(end_square)
      }else if(piece === "wR"){
        wr_list.push(end_square)
      }else if(piece === "bR"){
        br_list.push(end_square)
      }
    }
    //handle en passant
    en_passant = (piece === "wP" && end_square[1] === "4"
                 )? end_square[0]+"3" : (
                  piece == "bP" && end_square[1] === "5"
                 )? end_square[0]+"6":"";
    //original update notation start here
    let move_str = capture && !kc ? start_square + "x" + end_square : start_square + "-" + end_square
    move_str = chess_piece_ascii[original_piece] + move_str
    if(piece != original_piece && !kc){
     move_str += "=" + chess_piece_ascii[piece]
    }
    const move_list = document.getElementById("movelist")
    if(!turn){
      const row = document.createElement("tr")
      row.classList.add("move-row")
      const move_count = document.createElement("td")
      move_count.innerHTML = Math.floor((positions.length+1)/2)
      const move = document.createElement("td")
      move.id = "m"+position_index
      move.innerHTML = move_str
      row.append(move_count,move)
      move_list.append(row)
      document.getElementById("move-container").scrollTop = move.offsetTop-10
    }else{
      const move = document.createElement("td")
      move.innerHTML = move_str
      move.id = "m"+position_index
      move_list.lastChild.append(move)
    document.getElementById("move-container").scrollTop = move.offsetTop-10
    }
    const sq1 = document.getElementsByClassName("square-"+start_square)[0]
    const sq2 = document.getElementsByClassName("square-"+end_square)[0]
    sq1.classList.add("square","m"+position_index,)
    sq2.classList.add("square","m"+position_index)
    
    style.innerText = "#m"+position_index+"{font-weight: bold;}.square.black-3c85d.m"+position_index+"{background-color: DarkGray;}"+".square.white-1e1d7.m"+position_index+"{background-color: Gainsboro;}"
  }
  
  function rm_temp(){
    first_drag = false
    if(temp_object){
      temp_object.classList.remove("temporary")    
    }
    temp_piece = null
    temp_square = null
    temp_object = null
  }
  
  function attempt_castle(pos,piece,f0_n,r0,delta_1,delta_2){
    rook_list = piece == "wK" ? wr_list : piece == "bK" ? br_list : []
    for(let i = f0_n,j=r0;i != f0_n+8*delta_1 || j != r0+8*delta_2 ;i += delta_1,j += delta_2){
      delete pos[String.fromCharCode(i)+j]
      if(rook_list.includes(String.fromCharCode(i)+j)){
        rm(rook_list,(String.fromCharCode(i)+j))
        break
      }
    }
    pos[String.fromCharCode(f0_n+2*delta_1)+(r0+2*delta_2)] = piece
    pos[String.fromCharCode(f0_n+delta_1)+(r0+delta_2)] = piece[0]+"R"
  }
  
  //promotion handler
  //NOT the same as promotion interupt prevent.
  function promotion_handler(piece){
    board.position(positions[positions.length-1])
    pos = board.position()
    pos[promotion] = piece
    board.position(pos)
    promotion = null
    positions.pop()
    positions.push(board.position("fen"))
    document.getElementById("m"+position_index).innerHTML += "="+piece[1]  
  }

  //function that prevent promotion screen from being interupted
  function prevent_interupt_promotion(){
    if(promotion){
      if(!turn){
        document.getElementById("m"+position_index).remove()      
      }else{
        document.getElementById("m"+position_index).parentElement.remove()      
        
      }
      position_index = positions.length-2
      style.innerText = "#m"+position_index+"{font-weight: bold;}.square.black-3c85d.m"+position_index+"{background-color: DarkGray;}"+".square.white-1e1d7.m"+position_index+"{background-color: Gainsboro;}"
      board.position(positions[position_index])
      positions.pop()
      turn = !turn
      promotion = null
      return
    }else{
      return false
    }
  }

  //clean up function. remove temporary highlight after snap back.
  function SB(){
    
    rm_temp()
    
    pos = board.position()
    
    //remove "special" render piece/legal move
    remove_garbage(pos)
    
    board.position(pos)
    return "snapback"
  }
  
  //remove all the non-sense aka legal move highlights in the position
  function remove_garbage(pos){
    const removed_square = []
    for(let key in pos){
      if(pos[key][1] >= '0' && pos[key][1] <= '9'){
        removed_square.push(key)
        piece_ = pos[key]
        if(piece_.length == 2){
          index = Number(piece_[1])        
        }else{
          index = Number(piece_[1]+piece_[2])        
        }
        pos[key] = special_render[index][0]
      }
    }
    for(let key in pos){
      if(pos[key][1].toLowerCase() == pos[key][1]){
        removed_square.push(key)
        delete pos[key]
      }
    }
    return removed_square
  }

  // helpful helper function. remove el from array
  function rm(array,elm){
    const index = array.indexOf(elm);
    if (index > -1) { // only splice array when item is found
      array.splice(index, 1); // 2nd parameter means remove one item only
    }
  }

  // stop current move sound and play from begining
  function sound_effect(){
    audio.pause()
    audio.currentTime = 0;
    audio.play()
  }

  //seek to move
  function seek(move_number=null,delta=null){
    if(prevent_interupt_promotion()){
      return
    }
    const temp_index = position_index
    position_index = move_number != null ? move_number : position_index += delta;
    if(temp_index != position_index && position_index >= 0 && position_index <= positions.length-1){
      sound_effect()
      board.position(positions[position_index])
      style.innerText = "#m"+position_index+"{font-weight: bold;}.square.black-3c85d.m"+position_index+"{background-color: DarkGray;}"+".square.white-1e1d7.m"+position_index+"{background-color: Gainsboro;}"
      document.getElementById("move-container").scrollTop = document.getElementById("m"+position_index).offsetTop-10
    }else{
      position_index -= delta
    }
  }

  // fire when click hide/show legal move
  function mod_legal(){
    const el = document.getElementById("legal-move")
    el.innerHTML = legal_move ? "show legal move" : "hide legal move"
    el.style = legal_move ? "background:DarkSeaGreen" : "background:IndianRed"
    legal_move = !legal_move
  }

  function mode_switcher(){
    const el = document.getElementById("mode-switch")
    el.innerHTML = mode ? "move making mode" : "arrow drawing mode"
    el.style = mode ? "background:DarkSeaGreen" : "background:IndianRed"
    mode = !mode
  }

  function onMouseoverSquare(square, piece) {
    if(click_in_action && moused_square){
      permission = true
      el1 = document.getElementsByClassName("square-"+moused_square)[0]
      el2 = document.getElementsByClassName("square-"+square)[0]
      current_arrow = [el1.offsetLeft + el1.offsetWidth/2
                , el1.offsetTop + el2.offsetHeight/2
                , el2.offsetLeft  + el1.offsetWidth/2
                , el2.offsetTop + el1.offsetWidth/2]
      remove_arrow()
      arrows.forEach(arrow => drawArrow(...arrow));
      drawArrow(...current_arrow)
    }else{
      moused_square = square
    }
  }
  function drawArrow(fromx, fromy, tox, toy){
    //variables to be used when creating the arrow
    var c = document.getElementById("myCanvas");
    var ctx = c.getContext("2d");
    var headlen = 8;

    var angle = Math.atan2(toy-fromy,tox-fromx);
    
    //starting path of the arrow from the start square to the end square and drawing the stroke
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.strokeStyle = "#cc0000";
    ctx.lineWidth = 10;
    ctx.globalAlpha = 0.5;
    ctx.stroke();

    //starting a new path from the head of the arrow to one of the sides of the point
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),toy-headlen*Math.sin(angle-Math.PI/7));

    //path from the side point of the arrow, to the other side point
    ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/7),toy-headlen*Math.sin(angle+Math.PI/7));

    //path from the side point back to the tip of the arrow, and then again to the opposite side point
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),toy-headlen*Math.sin(angle-Math.PI/7));

    //draws the paths created above
    ctx.strokeStyle = "#cc0000";
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.fillStyle = "#cc0000";
    // ctx.stroke-opacity = 0.5;
    ctx.fill();
  }
  function remove_arrow(){
    let c = document.getElementById("myCanvas");
    let ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 400, 400);
  }
  function clear_arrow(){
    current_arrow = null
    arrows.length = 0
    touch1_square = null
    remove_arrow()
  }
  function array_is_same(arr1,arr2){
    if(!arr1 || !arr2){
      return false
    }
    let is_same = (arr1.length == arr2.length) && arr1.every(function(element, index) {
    return element === arr2[index]; 
});
    return is_same
  }
  
  let touch1_square = null
  function f1(event){
    if(mode){
      return
    }
    if(touch1_square && event.data.param1 != touch1_square){
      el1 = document.getElementsByClassName("square-"+touch1_square)[0]
      el2 = document.getElementsByClassName("square-"+event.data.param1)[0]
      let current_arrow = [el1.offsetLeft + el1.offsetWidth/2
                , el1.offsetTop + el2.offsetHeight/2
                , el2.offsetLeft  + el1.offsetWidth/2
                , el2.offsetTop + el1.offsetWidth/2]
      save_arrow(current_arrow)
      touch1_square = null
    }else{
      touch1_square = event.data.param1
    }
  }
  board.start()
}
main()
